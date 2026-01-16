import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path fill="#2C5234" fillRule="evenodd" d="M32 4C16 4 8 16 8 30C8 50 32 60 32 60C32 60 56 50 56 30C56 16 48 4 32 4zM32 6c15 0 22 10.5 22 24c0 18-20 27-22 28c-2-1-22-10-22-28C10 16.5 17 6 32 6zm-12 44l10-10 6 5 6-5 10 10H20zm11-18v-14h2v14h-2zm-10-5l10-9 10 9H21zm-4 7l14-10 14 10H17z"/>
      </svg>
    ),
    {
      ...size,
    }
  );
}
