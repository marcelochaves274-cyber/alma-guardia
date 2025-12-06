
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regra geral de acesso para documentos de um usuário
    match /users/{userId}/{collection}/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Garante que o usuário só possa ler/escrever seus próprios documentos
    // nas coleções de settings e occurrences.
    match /users/{userId}/settings/{settingId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /users/{userId}/occurrences/{occurrenceId} {
      allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
