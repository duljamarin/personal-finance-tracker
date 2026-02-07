import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            By accessing and using this personal finance tracking application ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            2. Use License
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Permission is granted to temporarily use the Service for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 ml-4">
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose</li>
            <li>Attempt to decompile or reverse engineer any software contained in the Service</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            3. Account Terms
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You must be 18 years or older to use this Service. You must provide your legal full name, a valid email address, and any other information requested in order to complete the signup process.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You are responsible for maintaining the security of your account and password. We cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You are responsible for all content posted and activity that occurs under your account.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            4. Payment and Subscription Terms
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            The Service offers both free and paid subscription plans. Paid plans require valid payment information and will be charged automatically on a recurring basis.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            A valid payment method is required to process payments for paid subscriptions. You will provide us or our third-party payment processor (Paddle) with accurate and complete billing information including legal name, address, and valid payment method information.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Subscriptions automatically renew unless cancelled before the renewal date. You can cancel your subscription at any time through your account settings or subscription management portal.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Free trials may be offered for certain subscription plans. If you do not cancel before the trial period ends, you will be automatically charged for the subscription.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            5. Cancellation and Refunds
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You may cancel your subscription at any time, and you will continue to have access until the end of your billing period. No refunds will be provided for partial subscription periods.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We reserve the right to refuse service to anyone for any reason at any time.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            6. Data and Privacy
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the Service and informs users of our data collection practices.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            7. Disclaimer
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            The materials on the Service are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            This Service is not intended to provide financial, legal, or tax advice. You should consult with appropriate professionals before making any financial decisions.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            8. Limitations
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            9. Changes to Terms
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms of Service on this page. Your continued use of the Service after any changes constitutes acceptance of the new Terms of Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            10. Contact Information
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            If you have any questions about these Terms, please contact us through our support channels.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Link
            to="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
