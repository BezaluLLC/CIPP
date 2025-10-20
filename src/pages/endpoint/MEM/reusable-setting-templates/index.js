import { Button } from "@mui/material";
import Link from "next/link";
import { AddBox, Delete, Edit, GitHub, RocketLaunch } from "@mui/icons-material";
import { Layout as DashboardLayout } from "/src/layouts/index.js";
import { CippTablePage } from "/src/components/CippComponents/CippTablePage.jsx";
import { ApiGetCall } from "/src/api/ApiCall";
import { CippPropertyListCard } from "../../../../components/CippCards/CippPropertyListCard";
import { getCippTranslation } from "../../../../utils/get-cipp-translation";
import { getCippFormatting } from "../../../../utils/get-cipp-formatting";

const Page = () => {
  const pageTitle = "Reusable Setting Templates";
  const integrations = ApiGetCall({
    url: "/api/ListExtensionsConfig",
    queryKey: "Integrations",
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const actions = [
    {
      label: "Edit Template",
      icon: <Edit />,
      link: "/endpoint/MEM/reusable-setting-templates/edit?id=[GUID]",
    },
    {
      label: "Save to GitHub",
      type: "POST",
      url: "/api/ExecCommunityRepo",
      icon: <GitHub />,
      data: {
        Action: "UploadTemplate",
        GUID: "GUID",
      },
      fields: [
        {
          label: "Repository",
          name: "FullName",
          type: "select",
          api: {
            url: "/api/ListCommunityRepos",
            data: {
              WriteAccess: true,
            },
            queryKey: "CommunityRepos-Write",
            dataKey: "Results",
            valueField: "FullName",
            labelField: "FullName",
          },
          multiple: false,
          creatable: false,
          required: true,
          validators: {
            required: { value: true, message: "Repository is required" },
          },
        },
        {
          label: "Commit Message",
          placeholder: "Enter a commit message",
          name: "Message",
          type: "textField",
          multiline: true,
          required: true,
          rows: 4,
        },
      ],
      confirmText: "Save this reusable setting template to the selected repository?",
      condition: () => integrations.isSuccess && integrations?.data?.GitHub?.Enabled,
    },
    {
      label: "Delete Template",
      type: "POST",
      url: "/api/RemoveReusableSettingTemplate",
      icon: <Delete />,
      data: {
        ID: "GUID",
      },
      confirmText: "Delete this reusable setting template?",
      multiPost: false,
    },
  ];

  const offCanvas = {
    children: (data) => {
      const keys = Object.keys(data).filter(
        (key) => !key.includes("@odata") && !key.includes("@data")
      );
      const properties = [];
      keys.forEach((key) => {
        if (data[key] && data[key].length !== 0) {
          properties.push({
            label: getCippTranslation(key),
            value: getCippFormatting(data[key], key),
          });
        }
      });

      return (
        <CippPropertyListCard
          cardSx={{ p: 0, m: -2 }}
          title="Template Details"
          propertyItems={properties}
          actionItems={actions}
          data={data}
        />
      );
    },
  };

  return (
    <CippTablePage
      title={pageTitle}
      apiUrl="/api/ListReusableSettingTemplates"
      queryKey="ListReusableSettingTemplates"
      tenantInTitle={false}
      actions={actions}
      cardButton={
        <>
          <Button
            component={Link}
            href="/endpoint/MEM/reusable-setting-templates/add"
            startIcon={<AddBox />}
          >
            Add Reusable Setting Template
          </Button>
          <Button
            component={Link}
            href="/endpoint/MEM/reusable-setting-templates/deploy"
            startIcon={<RocketLaunch />}
          >
            Deploy Reusable Setting Template
          </Button>
        </>
      }
      offCanvas={offCanvas}
      simpleColumns={["DisplayName", "Description", "SettingDefinitionId", "GUID"]}
    />
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
