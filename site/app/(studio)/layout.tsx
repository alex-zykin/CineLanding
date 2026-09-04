import type { Metadata } from 'next';
import StudioShell from './_components/studio-shell';
import './studio.css';

export const metadata: Metadata = {
  title: 'Studio — CineLanding',
  description: 'A local demo workspace for planning a CineLanding project.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StudioShell>{children}</StudioShell>;
}
