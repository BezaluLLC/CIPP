import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { Box } from "@mui/material";
import { Layout as DashboardLayout } from "/src/layouts/index.js";
import CippFormPage from "../../../../components/CippFormPages/CippFormPage";
import { ApiGetCall } from "../../../../api/ApiCall";
import { useSettings } from "../../../../hooks/use-settings";
import CippReusableSettingForm from "../../../../components/CippFormPages/CippReusableSettingForm";

const Page = () => {
  const router = useRouter();
  const { settingId } = router.query;
  const [ready, setReady] = useState(false);
  const { currentTenant } = useSettings();

  const getInfo = ApiGetCall({
    url: `/api/ListReusableSettings?settingId=${settingId}&tenantFilter=${currentTenant}`,
    queryKey: `ListReusableSettings-${settingId}`,
    waiting: ready,
  });

  useEffect(() => {
    if (settingId) {
      setReady(true);
      getInfo.refetch();
    }
  }, [settingId]);

  const formControl = useForm({
    mode: "onChange",
    defaultValues: {
      tenantFilter: currentTenant,
    },
  });

  useEffect(() => {
    if (getInfo.isSuccess && getInfo.data) {
      const record = Array.isArray(getInfo.data) ? getInfo.data[0] : getInfo.data;
      if (record) {
        const instanceJson = record.settingInstance
          ? JSON.stringify(record.settingInstance, null, 2)
          : "";
        formControl.reset({
          tenantFilter: currentTenant,
          settingId: record.id,
          displayName: record.displayName || "",
          description: record.description || "",
          settingDefinitionId: record.settingDefinitionId,
          settingDefinition: record.settingDefinitionId
            ? { label: record.settingDefinitionId, value: record.settingDefinitionId }
            : null,
          settingInstanceJson: instanceJson,
        });
      }
    }
  }, [getInfo.isSuccess, getInfo.data, currentTenant]);

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
      payload.settingId = settingId;
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
        formControl={formControl}
        queryKey={[`ListReusableSettings-${settingId}`, `reusable-settings-${currentTenant}`]}
        title={`Reusable Setting: ${getInfo.data?.displayName || getInfo.data?.[0]?.displayName || ""}`}
        formPageType="Edit"
        backButtonTitle="Reusable Settings"
        postUrl="/api/EditReusableSetting"
        customDataformatter={formatData}
      >
        <Box sx={{ my: 2 }}>
          <CippReusableSettingForm formControl={formControl} isEdit />
        </Box>
      </CippFormPage>
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
