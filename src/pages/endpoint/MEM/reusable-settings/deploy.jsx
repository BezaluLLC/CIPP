import { Layout as DashboardLayout } from "/src/layouts/index.js";
import { CippWizardConfirmation } from "/src/components/CippWizard/CippWizardConfirmation";
import CippWizardPage from "/src/components/CippWizard/CippWizardPage.jsx";
import { CippTenantStep } from "/src/components/CippWizard/CippTenantStep.jsx";
import { CippWizardReusableSettingsTemplates } from "/src/components/CippWizard/CippWizardReusableSettingsTemplates";

const Page = () => {
  const steps = [
    {
      title: "Step 1",
      description: "Tenant Selection",
      component: CippTenantStep,
      componentProps: {
        allTenants: false,
        type: "multiple",
      },
    },
    {
      title: "Step 2",
      description: "Choose Template",
      component: CippWizardReusableSettingsTemplates,
    },
    {
      title: "Step 3",
      description: "Confirmation",
      component: CippWizardConfirmation,
    },
  ];

  return (
    <CippWizardPage
      steps={steps}
      postUrl="/api/AddIntuneReusableSetting"
      wizardTitle="Reusable Settings Deployment"
    />
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
