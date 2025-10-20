import { Box } from "@mui/material";
import { useForm } from "react-hook-form";
import { Layout as DashboardLayout } from "/src/layouts/index.js";
import CippFormPage from "../../../../components/CippFormPages/CippFormPage";
import CippReusableSettingTemplateForm from "../../../../components/CippFormPages/CippReusableSettingTemplateForm";

const Page = () => {
  const formControl = useForm({
    mode: "onChange",
    defaultValues: {},
  });

  const formatData = (values) => {
    const { settingDefinition, settingInstanceJson, settingDefinitionId, ...rest } = values;
    const payload = { ...rest };

    const definitionId = settingDefinitionId || settingDefinition?.value;
    if (definitionId) {
      payload.settingDefinitionId = definitionId;
    }

    if (settingInstanceJson) {
      try {
        payload.settingInstance = JSON.parse(settingInstanceJson);
      } catch (error) {
        throw new Error("Setting instance JSON is invalid");
      }
    }

    return payload;
  };

  return (
    <>
      <CippFormPage
        resetForm={false}
        queryKey="ListReusableSettingTemplates"
        formControl={formControl}
        title="Reusable Setting Template"
        backButtonTitle="Reusable Setting Templates"
        postUrl="/api/AddReusableSettingTemplate"
        customDataformatter={formatData}
      >
        <Box sx={{ my: 2 }}>
          <CippReusableSettingTemplateForm formControl={formControl} />
        </Box>
      </CippFormPage>
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
