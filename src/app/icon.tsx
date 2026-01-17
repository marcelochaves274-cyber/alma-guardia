import { ImageResponse } from 'next/og';
 
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';
 
const imageUrl = 'https://firebasestorage.googleapis.com/v0/b/brave-drive-472322-m2.appspot.com/o/Logo%20da%20SGS%20APP%20com%20natureza.png?alt=media&token=4ee1a47a-0188-4730-8458-58443665c8ec';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={32}
          height={32}
          src={imageUrl}
          alt="SGS APP Icon"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
