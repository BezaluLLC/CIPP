import { useEffect } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { Box } from "@mui/material";
import { Layout as DashboardLayout } from "/src/layouts/index.js";
import CippFormPage from "../../../../components/CippFormPages/CippFormPage";
import CippReusableSettingTemplateForm from "../../../../components/CippFormPages/CippReusableSettingTemplateForm";
import { ApiGetCall } from "../../../../api/ApiCall";

const Page = () => {
  const router = useRouter();
  const { id } = router.query;
  const formControl = useForm({
    mode: "onChange",
    defaultValues: {},
  });

  const templateInfo = ApiGetCall({
    url: `/api/ListReusableSettingTemplates?id=${id}`,
    queryKey: `ListReusableSettingTemplates-${id}`,
    waiting: Boolean(id),
  });

  useEffect(() => {
    if (templateInfo.isSuccess && templateInfo.data) {
      const record = Array.isArray(templateInfo.data) ? templateInfo.data[0] : templateInfo.data;
      if (record) {
        const instanceJson = record.SettingInstance
          ? JSON.stringify(record.SettingInstance, null, 2)
          : record.settingInstance
          ? JSON.stringify(record.settingInstance, null, 2)
          : "";

        const definitionId = record.SettingDefinitionId || record.settingDefinitionId;

        formControl.reset({
          GUID: record.GUID || record.guid || id,
          displayName: record.DisplayName || record.displayName || "",
          description: record.Description || record.description || "",
          settingDefinitionId: definitionId,
          settingDefinition: definitionId
            ? {
                label: definitionId,
                value: definitionId,
              }
            : null,
          settingInstanceJson: instanceJson,
        });
      }
    }
  }, [templateInfo.isSuccess, templateInfo.data, id]);

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
        formControl={formControl}
        queryKey={[`ListReusableSettingTemplates-${id}`, "ListReusableSettingTemplates"]}
        title={`Reusable Setting Template: ${
          templateInfo.data?.DisplayName || templateInfo.data?.displayName || ""
        }`}
        formPageType="Edit"
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
