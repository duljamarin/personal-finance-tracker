import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            1. Information We Collect
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We collect information you provide directly to us when you create an account, use our Service, or communicate with us. This includes:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 ml-4">
            <li>Email address and password</li>
            <li>Financial transaction data (amounts, categories, dates, descriptions)</li>
            <li>Budget and goal information</li>
            <li>Payment information (processed securely by our payment processor, Paddle)</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            2. How We Use Your Information
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 ml-4">
            <li>Provide, maintain, and improve our Service</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices, updates, and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Analyze usage patterns to improve user experience</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            3. Data Storage and Security
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Your data is stored securely using Supabase, a PostgreSQL database with enterprise-grade security. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            4. Payment Processing
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Payment information is processed by Paddle, our third-party payment processor. We do not store your full credit card information on our servers. Paddle's privacy policy governs the collection and processing of your payment information.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            5. Data Retention
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We retain your information for as long as your account is active or as needed to provide you services. If you wish to delete your account, please contact us. After account deletion, we may retain certain information as required by law or for legitimate business purposes.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            6. Data Sharing
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 ml-4">
            <li>With service providers who assist in our operations (e.g., Paddle for payment processing)</li>
            <li>To comply with legal obligations or respond to lawful requests</li>
            <li>To protect our rights, privacy, safety, or property</li>
            <li>With your consent or at your direction</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            7. Cookies and Tracking
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            8. Your Data Rights
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 ml-4">
            <li>Access, update, or delete your personal information</li>
            <li>Object to processing of your information</li>
            <li>Request restriction of processing your information</li>
            <li>Request transfer of your information</li>
            <li>Withdraw consent at any time</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            9. Children's Privacy
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Our Service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18. If you become aware that a child has provided us with personal information, please contact us.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            10. Changes to This Privacy Policy
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            11. Contact Us
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            If you have any questions about this Privacy Policy, please contact us through our support channels.
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
