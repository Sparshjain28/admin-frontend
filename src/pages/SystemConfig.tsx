import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Sliders, Percent, FileCheck, Layers, Globe } from "lucide-react";
import LoanComparisonChargesPage from './LoanComparisonChargesPage';

export default function SystemConfig() {
    const [activeTab, setActiveTab] = useState("loan-charges");

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Main Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Settings className="w-6 h-6 text-blue-600" />
                            System Configuration
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Configure customer-facing loan fees, document policies, and global pipeline rules.
                        </p>
                    </div>

                    <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
                        <TabsTrigger value="loan-charges" className="flex items-center gap-2 text-xs sm:text-sm">
                            <Percent className="w-4 h-4 text-blue-600" />
                            Loan Comparison Charges
                        </TabsTrigger>
                        <TabsTrigger value="rules" className="flex items-center gap-2 text-xs sm:text-sm">
                            <Layers className="w-4 h-4" />
                            Pipeline & Doc Rules
                        </TabsTrigger>
                        <TabsTrigger value="integrations" className="flex items-center gap-2 text-xs sm:text-sm">
                            <Globe className="w-4 h-4" />
                            Integrations
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Tab 1: Loan Comparison Charges & Statutory Fees */}
                <TabsContent value="loan-charges" className="mt-0 focus-visible:outline-none">
                    <LoanComparisonChargesPage />
                </TabsContent>

                {/* Tab 2: Document & Stage Rules */}
                <TabsContent value="rules" className="mt-0 space-y-6 focus-visible:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="glass-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <FileCheck className="w-4 h-4 text-blue-500" />
                                    Document Rules
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    Set mandatory docs based on case types (Used Car Loan, Refinance, Purchase).
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="glass-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-indigo-500" />
                                    Stage Rules
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    Map role-based transitions and 24-hr SLAs for loan pipelines.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Tab 3: Integrations */}
                <TabsContent value="integrations" className="mt-0 focus-visible:outline-none">
                    <div className="glass-panel rounded-2xl p-6 min-h-[300px]">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-indigo-500" />
                            Integrations Configuration
                        </h2>
                        <div className="text-center text-gray-500 py-12">
                            Third-party partner webhooks and API configuration panels are active in API Integrations.
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
