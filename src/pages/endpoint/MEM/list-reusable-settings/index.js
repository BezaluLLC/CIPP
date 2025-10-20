import { Button } from "@mui/material";
import { Stack } from "@mui/system";
import { Add, DeleteOutline, Edit, SaveAlt } from "@mui/icons-material";
import Link from "next/link";
import { CippTablePage } from "/src/components/CippComponents/CippTablePage.jsx";
import { Layout as DashboardLayout } from "/src/layouts/index.js";
import { useSettings } from "../../../../hooks/use-settings";
import CippJsonView from "../../../../components/CippFormPages/CippJSONView.jsx";

const Page = () => {
  const { currentTenant } = useSettings();
  const pageTitle = "Reusable Settings";

  const actions = [
    {
      label: "Edit Reusable Setting",
      link: "/endpoint/MEM/list-reusable-settings/edit?settingId=[id]",
      multiPost: false,
      icon: <Edit />,
      color: "success",
    },
    {
      label: "Create template from setting",
      type: "POST",
      url: "/api/AddReusableSettingTemplate",
      icon: <SaveAlt />,
      data: {
        displayName: "displayName",
        description: "description",
        settingDefinitionId: "settingDefinitionId",
        settingInstance: "settingInstance",
      },
      confirmText: "Create a reusable setting template based on this setting?",
      multiPost: false,
    },
    {
      label: "Delete Reusable Setting",
      type: "POST",
      url: "/api/ExecReusableSetting",
      icon: <DeleteOutline />,
      data: {
        Action: "Delete",
        ID: "id",
      },
      confirmText: "Are you sure you want to delete this reusable setting?",
      multiPost: false,
    },
  ];

  const offCanvas = {
    children: (data) => (
      <CippJsonView
        object={data}
        type="ReusableSetting"
        defaultOpen
      />
    ),
    actions,
  };

  return (
    <CippTablePage
      title={pageTitle}
      cardButton={
        <Stack direction="row" spacing={1}>
          <Button component={Link} href="/endpoint/MEM/list-reusable-settings/add" startIcon={<Add />}>
            Add Reusable Setting
          </Button>
        </Stack>
      }
      apiUrl="/api/ListReusableSettings"
      queryKey={`reusable-settings-${currentTenant}`}
      actions={actions}
      offCanvas={offCanvas}
      simpleColumns={["displayName", "description", "settingDefinitionId"]}
    />
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
