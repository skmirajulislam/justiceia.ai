"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, CheckCircle, AlertCircle, User, FileText, Video } from 'lucide-react';
import Navbar from '@/components/Navbar';
import React from 'react';

const VKYC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);

  const steps = [
    { id: 1, title: 'Personal Information', icon: User },
    { id: 2, title: 'Document Upload', icon: FileText },
    { id: 3, title: 'Video Verification', icon: Video },
    { id: 4, title: 'Verification Complete', icon: CheckCircle }
  ];

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const startVideoRecording = () => {
    setIsRecording(true);
    // Simulate video recording
    setTimeout(() => {
      setIsRecording(false);
      handleNextStep();
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
      <Navbar />
      <div className="container my-15 mx-auto px-4 pt-20 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Camera className="w-8 h-8 text-sky-500" />
              <h1 className="text-3xl font-bold text-slate-900">Video KYC Verification</h1>
            </div>
            <p className="text-slate-600">Complete your identity verification to access all legal services</p>
          </div>

          {/* Progress Steps */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= step.id
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                      }`}>
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div className="ml-3 hidden md:block">
                      <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-sky-600' : 'text-slate-600'
                        }`}>
                        Step {step.id}
                      </p>
                      <p className="text-xs text-slate-500">{step.title}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-16 h-1 mx-4 ${currentStep > step.id ? 'bg-sky-500' : 'bg-slate-200'
                        }`}></div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {React.createElement(steps[currentStep - 1].icon, { className: "w-5 h-5" })}
                <span>{steps[currentStep - 1].title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentStep === 1 && (
                <div className="space-y-6 text-black">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 ">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="Enter your first name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Enter your last name" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" placeholder="Enter your email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="Enter your phone number" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <textarea
                      id="address"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md"
                      rows={3}
                      placeholder="Enter your complete address"
                    ></textarea>
                  </div>
                  <Button onClick={handleNextStep} className="w-full">
                    Continue to Document Upload
                  </Button>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-dashed border-2 border-slate-300 hover:border-sky-400 transition-colors">
                      <CardContent className="p-6 text-center">
                        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="font-medium mb-2">Aadhaar Card</h3>
                        <p className="text-sm text-slate-600 mb-4">Upload front and back images</p>
                        <Button variant="outline" size="sm">
                          Choose Files
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-dashed border-2 border-slate-300 hover:border-sky-400 transition-colors">
                      <CardContent className="p-6 text-center">
                        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="font-medium mb-2">PAN Card</h3>
                        <p className="text-sm text-slate-600 mb-4">Upload clear image of PAN card</p>
                        <Button variant="outline" size="sm">
                          Choose File
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">Document Guidelines</h4>
                        <ul className="text-sm text-blue-700 mt-2 space-y-1">
                          <li>• Ensure documents are clear and legible</li>
                          <li>• File size should be less than 5MB</li>
                          <li>• Accepted formats: JPG, PNG, PDF</li>
                          <li>• Avoid blurry or cropped images</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleNextStep} className="w-full">
                    Continue to Video Verification
                  </Button>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-6 bg-slate-200 rounded-full flex items-center justify-center">
                      {isRecording ? (
                        <div className="w-16 h-16 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
                          <Video className="w-8 h-8 text-white" />
                        </div>
                      ) : (
                        <Video className="w-16 h-16 text-slate-400" />
                      )}
                    </div>

                    <h3 className="text-xl font-semibold mb-2">Video Verification</h3>
                    <p className="text-slate-600 mb-6">
                      {isRecording
                        ? "Recording in progress... Please look at the camera and speak clearly."
                        : "Click the button below to start your video verification session."
                      }
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Instructions</h4>
                        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                          <li>• Ensure you&#39;re in a well-lit environment</li>
                          <li>• Keep your documents ready for verification</li>
                          <li>• Speak clearly and follow the on-screen instructions</li>
                          <li>• The verification process takes about 2-3 minutes</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button
                      onClick={startVideoRecording}
                      disabled={isRecording}
                      className="px-8 py-3"
                    >
                      {isRecording ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Recording...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Start Video Verification
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-green-800 mb-2">Verification Complete!</h3>
                    <p className="text-slate-600 mb-6">
                      Your KYC verification has been completed successfully. You now have full access to all legal services.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <Badge className="bg-green-100 text-green-800 mb-2">Verified</Badge>
                        <p className="font-medium">Identity</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <Badge className="bg-green-100 text-green-800 mb-2">Verified</Badge>
                        <p className="font-medium">Documents</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <Badge className="bg-green-100 text-green-800 mb-2">Verified</Badge>
                        <p className="font-medium">Video KYC</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Button className="w-full" onClick={() => window.location.href = '/'}>
                    Access Legal Services
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VKYC;
