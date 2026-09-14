import * as admin from "firebase-admin";
import Stripe from "stripe";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";

admin.initializeApp();

const stripeKey = process.env.STRIPE_SECRET_KEY || "";

export const stripeWebhook = onRequest(
  { cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    try {
      if (!stripeKey) {
        res.status(500).send("Stripe is not configured");
        return;
      }
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2023-10-16" as any,
      });
      const sig = req.headers["stripe-signature"] as string;
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err: any) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const clientReferenceId = session.client_reference_id;

        if (clientReferenceId) {
          await admin
            .firestore()
            .collection("sgs_genius")
            .doc(clientReferenceId)
            .update({
              status: "active",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          console.log(`Usuário ${clientReferenceId} ativado com sucesso!`);
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

function asDate(value: any): Date | null {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type NotificationKind = "all" | "equipment" | "treatment";

interface SendNotificationOptions {
  kind?: NotificationKind;
  location?: string;
}

// Filtra os tokens elegíveis para uma notificação. Tokens sem "profileScope" ou
// com profileScope === "admin" sempre recebem tudo (comportamento inalterado para o Administrador).
// Tokens de perfil personalizado ("custom") só recebem alertas de tratamento/equipamento
// dos locais permitidos para aquele perfil, e nunca recebem avisos ("all").
function filterEligibleTokenDocs(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  opts?: SendNotificationOptions
): FirebaseFirestore.QueryDocumentSnapshot[] {
  const kind = opts?.kind ?? "all";
  const location = opts?.location;

  return docs.filter((docSnap) => {
    const data = docSnap.data();
    if (data.profileScope !== "custom") return true;
    if (kind === "all") return false;

    const allowedLocations: string[] | null =
      (kind === "equipment" ? data.equipmentLocations : data.treatmentLocations) ?? null;

    // null = perfil vê todos os locais nesse módulo; array vazio = perfil não vê o módulo.
    if (allowedLocations === null) return true;
    if (!location) return false;
    return allowedLocations.includes(location);
  });
}

async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  opts?: SendNotificationOptions
) {
  try {
    const database = admin.firestore();
    console.log(`[NOTIFY] Enviando para ${userId}`);
    
    const tokenSnapshot = await database
      .collection("sgs_genius")
      .doc(userId)
      .collection("fcmTokens")
      .get();
    
    if (tokenSnapshot.empty) {
      console.warn(`[NOTIFY] ❌ Sem tokens para ${userId}`);
      return;
    }

    const eligibleDocs = filterEligibleTokenDocs(tokenSnapshot.docs, opts);
    console.log(
      `[NOTIFY] Tokens no total: ${tokenSnapshot.docs.length} | eleg\u00edveis: ${eligibleDocs.length} | kind=${opts?.kind ?? "all"} location=${opts?.location ?? "-"}`
    );
    tokenSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      console.log(
        `[NOTIFY]   token=...${String(data.token).slice(-8)} profileScope=${data.profileScope ?? "(sem)"} equipmentLocations=${JSON.stringify(data.equipmentLocations ?? null)} treatmentLocations=${JSON.stringify(data.treatmentLocations ?? null)}`
      );
    });
    if (!eligibleDocs.length) {
      console.warn(`[NOTIFY] ❌ Nenhum token elegível para ${userId} (kind=${opts?.kind ?? "all"}, location=${opts?.location ?? "-"})`);
      return;
    }

    const tokens = eligibleDocs.map((doc) => doc.get("token"));
    console.log(`[NOTIFY] ✅ ${tokens.length} token(s) encontrado(s)`);
    
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      // TTL de 2h: se o dispositivo estiver offline além disso, o FCM descarta a mensagem
      // em vez de entregá-la atrasada quando o dispositivo reconectar (evita notificações acumuladas).
      webpush: { headers: { TTL: "7200" } },
    });
    console.log(`[NOTIFY] Resultado: ${response.successCount}✓ ${response.failureCount}✗`);
    
    const failedTokens = response.responses
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => !result.success && 
        ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]
        .includes(result.error?.code || ""));
    
    if (failedTokens.length > 0) {
      await Promise.all(
        failedTokens.map(({ index }) =>
          eligibleDocs[index].ref.delete()
        )
      );
    }
  } catch (error) {
    console.error(`[NOTIFY] Erro: ${error}`);
  }
}

function isOverdueTreatment(data: any, now = new Date()) {
  const completionDate = asDate(data?.completionDate);
  return data?.situation === "pendente" && !!completionDate && completionDate < now;
}

function isCriticalEquipment(data: any, now = new Date()) {
  if (!data || data.status === "descartado") return false;
  const manufacturingDate = asDate(data.manufacturingDate);
  if (manufacturingDate && (data.validityYears || data.validityMonths)) {
    const expiryDate = new Date(manufacturingDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + Number(data.validityYears || 0));
    expiryDate.setMonth(expiryDate.getMonth() + Number(data.validityMonths || 0));
    if (expiryDate < now) return true;
  }
  const inspectionDate = asDate(data.nextInspectionDate);
  return !!inspectionDate && inspectionDate < now;
}

export const notifyOverdueTreatment = onDocumentWritten(
  "sgs_genius/{userId}/risk_treatments/{treatmentId}",
  async (event) => {
    const userId = event.params.userId;
    if (!userId) return;
    
    const before = event.data?.before.exists ? event.data.before.data() : null;
    const after = event.data?.after.exists ? event.data.after.data() : null;
    
    if (isOverdueTreatment(after) && !isOverdueTreatment(before)) {
      await sendNotificationToUser(
        userId,
        "ALMA Guardia - Tratamento atrasado",
        "Um tratamento de risco entrou em atraso.",
        { kind: "treatment", location: after?.treatmentLocation }
      );
    }
  }
);

export const notifyCriticalEquipment = onDocumentWritten(
  "sgs_genius/{userId}/equipments/{equipmentId}",
  async (event) => {
    const userId = event.params.userId;
    if (!userId) return;
    
    const before = event.data?.before.exists ? event.data.before.data() : null;
    const after = event.data?.after.exists ? event.data.after.data() : null;
    
    if (isCriticalEquipment(after) && !isCriticalEquipment(before)) {
      await sendNotificationToUser(
        userId,
        "ALMA Guardia - Equipamento crítico",
        "Uma vistoria ou validade de equipamento entrou em atraso.",
        { kind: "equipment", location: after?.storageLocation }
      );
    }
  }
);

export const notifyPendingNotice = onDocumentWritten(
  "sgs_genius/{userId}/notices/{noticeId}",
  async (event) => {
    const userId = event.params.userId;
    if (!userId) return;
    
    const before = event.data?.before.exists ? event.data.before.data() : null;
    const after = event.data?.after.exists ? event.data.after.data() : null;
    
    if (after?.status === "pendente" && before?.status !== "pendente") {
      await sendNotificationToUser(
        userId,
        "ALMA Guardia - Novo aviso",
        "Um novo aviso está aguardando análise do administrador."
      );
    }
  }
);

interface LocationCounts {
  overdueTreatments: number;
  overdueEquipments: number;
  expiredEquipments: number;
}

// Calcula os alertas críticos de um usuário (admin), agrupados por local, e envia:
// - para tokens "admin": o resumo completo de sempre (todos os locais + avisos pendentes).
// - para tokens "custom" (perfil personalizado): só a soma dos locais que aquele perfil pode ver,
//   sem avisos. Cada token tem seu próprio cooldown de 1h para não repetir o mesmo alerta.
async function sendCriticalSummaryToUser(userId: string) {
  const database = admin.firestore();
  const userRef = database.collection("sgs_genius").doc(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [treatments, equipments, notices, tokenSnapshot] = await Promise.all([
    userRef.collection("risk_treatments").get(),
    userRef.collection("equipments").get(),
    userRef.collection("notices").where("status", "==", "pendente").get(),
    userRef.collection("fcmTokens").get(),
  ]);

  if (tokenSnapshot.empty) {
    console.warn(`[REMINDERS] Sem tokens para ${userId}`);
    return;
  }

  const perLocation: Record<string, LocationCounts> = {};
  const bump = (location: string | undefined, key: keyof LocationCounts) => {
    const loc = location || "Sem local";
    if (!perLocation[loc]) perLocation[loc] = { overdueTreatments: 0, overdueEquipments: 0, expiredEquipments: 0 };
    perLocation[loc][key]++;
  };

  let totalOverdueTreatments = 0;
  treatments.forEach((snapshot) => {
    const treatment = snapshot.data();
    const completionDate = asDate(treatment.completionDate);
    if (treatment.situation === "pendente" && completionDate && completionDate < today) {
      totalOverdueTreatments++;
      bump(treatment.treatmentLocation, "overdueTreatments");
    }
  });

  let totalOverdueEquipments = 0;
  let totalExpiredEquipments = 0;
  equipments.forEach((snapshot) => {
    const equipment = snapshot.data();
    if (equipment.status === "descartado") return;

    const manufacturingDate = asDate(equipment.manufacturingDate);
    if (manufacturingDate && (equipment.validityYears || equipment.validityMonths)) {
      const expiryDate = new Date(manufacturingDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + Number(equipment.validityYears || 0));
      expiryDate.setMonth(expiryDate.getMonth() + Number(equipment.validityMonths || 0));
      if (expiryDate < today) {
        totalExpiredEquipments++;
        bump(equipment.storageLocation, "expiredEquipments");
        return;
      }
    }

    const inspectionDate = asDate(equipment.nextInspectionDate);
    if (inspectionDate && inspectionDate < today) {
      totalOverdueEquipments++;
      bump(equipment.storageLocation, "overdueEquipments");
    }
  });

  const adminMessages: string[] = [];
  if (totalOverdueTreatments) adminMessages.push(`Existe: ${totalOverdueTreatments} Tratamentos Atrasados`);
  if (totalOverdueEquipments) adminMessages.push(`Existe: ${totalOverdueEquipments} Vistoria de Equipamentos Atrasadas`);
  if (totalExpiredEquipments) adminMessages.push(`Existe: ${totalExpiredEquipments} Validade de Equipamentos Expirada`);
  if (notices.size) adminMessages.push(`Existe: ${notices.size} Avisos Pendentes`);

  const now = Date.now();
  const cooldownMs = 60 * 60 * 1000; // 1 hora
  const stateRef = userRef.collection("meta").doc("criticalAlertState");
  const stateDoc = await stateRef.get();
  const state: Record<string, { hash: string; notifiedAt: number }> = stateDoc.exists ? stateDoc.data() || {} : {};
  const nextState = { ...state };
  let stateChanged = false;

  const shouldSend = (key: string, hash: string): boolean => {
    const prev = state[key];
    return !(prev?.hash === hash && prev?.notifiedAt && now - prev.notifiedAt < cooldownMs);
  };
  const markSent = (key: string, hash: string) => {
    nextState[key] = { hash, notifiedAt: now };
    stateChanged = true;
  };

  const sendPromises: Promise<unknown>[] = [];

  for (const tokenDoc of tokenSnapshot.docs) {
    const data = tokenDoc.data();
    const token = data.token as string;
    if (!token) continue;

    if (data.profileScope !== "custom") {
      if (!adminMessages.length) continue;
      const hash = adminMessages.join("|");
      if (!shouldSend("admin", hash)) continue;
      markSent("admin", hash);
      sendPromises.push(
        admin.messaging().send({
          token,
          notification: {
            title: "ALMA Guardia - Alertas Críticos",
            body: adminMessages.join("\n"),
          },
          webpush: { headers: { TTL: "7200" } },
        }).catch((error) => console.error(`[REMINDERS] Falha ao enviar (admin): ${error}`))
      );
      continue;
    }

    // Perfil personalizado: soma só os locais permitidos por módulo, sem avisos.
    const equipmentLocations: string[] | null = data.equipmentLocations ?? null;
    const treatmentLocations: string[] | null = data.treatmentLocations ?? null;

    let customTreatments = 0;
    let customOverdueEquip = 0;
    let customExpiredEquip = 0;

    for (const [location, counts] of Object.entries(perLocation)) {
      if (treatmentLocations === null || treatmentLocations.includes(location)) {
        customTreatments += counts.overdueTreatments;
      }
      if (equipmentLocations === null || equipmentLocations.includes(location)) {
        customOverdueEquip += counts.overdueEquipments;
        customExpiredEquip += counts.expiredEquipments;
      }
    }

    const customMessages: string[] = [];
    if (customTreatments) customMessages.push(`Existe: ${customTreatments} Tratamentos Atrasados`);
    if (customOverdueEquip) customMessages.push(`Existe: ${customOverdueEquip} Vistoria de Equipamentos Atrasadas`);
    if (customExpiredEquip) customMessages.push(`Existe: ${customExpiredEquip} Validade de Equipamentos Expirada`);

    if (!customMessages.length) continue;
    const hash = customMessages.join("|");
    const stateKey = `custom:${token}`;
    if (!shouldSend(stateKey, hash)) continue;
    markSent(stateKey, hash);

    sendPromises.push(
      admin.messaging().send({
        token,
        notification: {
          title: "ALMA Guardia - Alertas Críticos",
          body: customMessages.join("\n"),
        },
        webpush: { headers: { TTL: "7200" } },
      }).catch((error) => console.error(`[REMINDERS] Falha ao enviar (perfil personalizado): ${error}`))
    );
  }

  await Promise.all(sendPromises);
  if (stateChanged) {
    await stateRef.set(nextState, { merge: true });
  }
}

export const sendCriticalReminders = onSchedule(
  { schedule: "0 8,13 * * *", timeZone: "America/Sao_Paulo" },
  async () => {
    const database = admin.firestore();
    console.log("[REMINDERS] Iniciando busca de alertas críticos...");
    const users = await database.collection("sgs_genius").listDocuments();
    console.log(`[REMINDERS] Encontrados ${users.length} usuário(s)`);

    for (const userReference of users) {
      console.log(`[REMINDERS] Processando usuário: ${userReference.id}`);
      await sendCriticalSummaryToUser(userReference.id);
    }

    console.log("[REMINDERS] Conclusão da busca de alertas críticos");
  },
);
