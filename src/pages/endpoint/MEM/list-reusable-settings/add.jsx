import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Box } from "@mui/material";
import CippFormPage from "../../../../components/CippFormPages/CippFormPage";
import { Layout as DashboardLayout } from "/src/layouts/index.js";
import { useSettings } from "../../../../hooks/use-settings";
import CippReusableSettingForm from "../../../../components/CippFormPages/CippReusableSettingForm";

const Page = () => {
  const userSettingsDefaults = useSettings();

  const formControl = useForm({
    mode: "onChange",
    defaultValues: {
      tenantFilter: userSettingsDefaults.currentTenant,
      settingInstanceJson: "{\n  \"@odata.type\": \"#microsoft.graph.deviceManagementConfigurationSimpleSettingInstance\"\n}",
    },
  });

  useEffect(() => {
    formControl.setValue("tenantFilter", userSettingsDefaults?.currentTenant || "");
  }, [userSettingsDefaults, formControl]);

  const formatData = (values) => {
    const {
      settingDefinition,
      settingInstanceJson,
      settingDefinitionId,
      settingId,
      ...rest
    } = values;

    const payload = { ...rest };

    const definitionId = settingDefinitionId || settingDefinition?.value;
    if (definitionId) {
      payload.settingDefinitionId = definitionId;
    }

    if (settingId) {
      payload.id = settingId;
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
        queryKey={`reusable-settings-${userSettingsDefaults.currentTenant}`}
        formControl={formControl}
        title="Reusable Setting"
        backButtonTitle="Reusable Settings"
        postUrl="/api/AddReusableSetting"
        customDataformatter={formatData}
      >
        <Box sx={{ my: 2 }}>
          <CippReusableSettingForm formControl={formControl} />
        </Box>
      </CippFormPage>
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
