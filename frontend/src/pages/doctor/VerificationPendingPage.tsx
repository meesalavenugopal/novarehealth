import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { Navbar, Footer } from '../../components/layout';

export const VerificationPendingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <Card className="max-w-lg w-full p-8 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Application Under Review
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for applying to join NovareHealth as a doctor. 
            Our team is reviewing your application and documents.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Expected Review Time:</span>
              <span className="font-medium text-gray-900">1-3 Business Days</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 text-left">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Application Submitted</p>
                <p className="text-sm text-gray-500">Your information has been received</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Document Verification</p>
                <p className="text-sm text-gray-500">Our team is verifying your credentials</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
              </div>
              <div>
                <p className="font-medium text-gray-400">Account Activation</p>
                <p className="text-sm text-gray-400">You'll be notified once approved</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-4">
              We'll send you an email and SMS once your application is approved.
              In the meantime, you can:
            </p>
            
            <div className="flex gap-4">
              <Link to="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  Go Home
                </Button>
              </Link>
              <Link to="/help" className="flex-1">
                <Button variant="secondary" className="w-full">
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default VerificationPendingPage;
