import { ImageResponse } from 'next/og';
import { SgsAppLogo } from '@/components/icons';
 
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';
 
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
          backgroundColor: '#263d20',
          borderRadius: '50%',
        }}
      >
        <SgsAppLogo style={{ width: '75%', height: '75%', fill: '#ffffff' }} />
      </div>
    ),
    {
      ...size,
    }
  );
}
