import { Layout as DashboardLayout } from "/src/layouts/index.js";
import CippWizardPage from "/src/components/CippWizard/CippWizardPage.jsx";
import { CippTenantStep } from "/src/components/CippWizard/CippTenantStep.jsx";
import { CippWizardConfirmation } from "/src/components/CippWizard/CippWizardConfirmation";
import { CippWizardReusableSettingTemplates } from "../../../../components/CippWizard/CippWizardReusableSettingTemplates";

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
      component: CippWizardReusableSettingTemplates,
    },
    {
      title: "Step 3",
      description: "Confirmation",
      component: CippWizardConfirmation,
    },
  ];

  return (
    <>
      <CippWizardPage
        steps={steps}
        postUrl="/api/AddReusableSetting"
        wizardTitle="Reusable Setting Template Deployment"
      />
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
