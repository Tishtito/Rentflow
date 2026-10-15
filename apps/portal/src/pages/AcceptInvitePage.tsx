import { Link } from 'react-router-dom';
import { LogoMark, Notice } from '@rentflow/ui';

/**
 * Opened from the invitation link: /invite/:token. The design (set password → activate) is in
 * kims-frontend's AcceptInvitePage; it's wired up with the invitation-accept API (portal API step).
 */
export function AcceptInvitePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-canvas">
      <div className="flex flex-col gap-[18px] bg-brand px-6 pb-[72px] pt-9 text-white">
        <div className="flex items-center gap-2.5">
          <LogoMark className="text-brand-mint" width={26} height={26} />
          <span className="font-display text-[17px] font-bold">Tenant portal</span>
        </div>
        <h1 className="m-0 font-display text-[30px] font-bold leading-tight">Karibu</h1>
      </div>

      <div className="mx-4 -mt-11 flex flex-col gap-4 rounded-xl bg-surface p-[22px] shadow-sheet">
        <h2 className="m-0 text-lg font-semibold">Set your password</h2>
        <Notice tone="info">Accepting invitations online is coming soon. Your landlord will help you set up your login for now.</Notice>
        <Link to="/login" className="text-sm">
          I already have a password
        </Link>
      </div>
    </div>
  );
}
