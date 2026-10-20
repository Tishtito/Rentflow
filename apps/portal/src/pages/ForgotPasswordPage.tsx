import { Link } from 'react-router-dom';
import { GlassAuthHeading, GlassAuthLayout, glassLink } from '@rentflow/ui';
import { authPhotos } from '../PortalLayout';

/** Password reset isn't built yet (no API); explains what to do meanwhile. */
export function ForgotPasswordPage() {
  return (
    <GlassAuthLayout photos={authPhotos} tagline="It happens">
      <GlassAuthHeading title="Forgot your password?" subtitle="Resetting it from here is coming soon" />
      <p className="m-0 mb-5 text-[15px] leading-relaxed">
        Ask your landlord or caretaker to send you a new invitation link, then set a new password from it.
      </p>
      <Link to="/login" className={glassLink}>
        ← Back to log in
      </Link>
    </GlassAuthLayout>
  );
}
