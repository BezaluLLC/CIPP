import { useEffect } from "react";
import { Stack } from "@mui/material";
import { Grid } from "@mui/system";
import { useWatch } from "react-hook-form";
import CippFormComponent from "../CippComponents/CippFormComponent";
import CippWizardStepButtons from "./CippWizardStepButtons";
import { getCippValidator } from "/src/utils/get-cipp-validator";

export const CippWizardReusableSettingTemplates = (props) => {
  const { postUrl, formControl, onPreviousStep, onNextStep, currentStep } = props;
  const templateSelection = useWatch({ control: formControl.control, name: "TemplateList" });
  const definitionSelection = useWatch({ control: formControl.control, name: "settingDefinition" });
  const settingInstanceJson = useWatch({ control: formControl.control, name: "settingInstanceJson" });

  useEffect(() => {
    if (templateSelection?.addedFields) {
      const addedFields = templateSelection.addedFields;
      const templateDisplayName =
        addedFields.displayName || addedFields.DisplayName || templateSelection.label;
      const templateDescription = addedFields.description || addedFields.Description || "";
      const templateDefinitionId =
        addedFields.settingDefinitionId || addedFields.SettingDefinitionId || "";
      const templateInstance = addedFields.settingInstance || addedFields.SettingInstance;

      formControl.setValue("displayName", templateDisplayName || "");
      formControl.setValue("description", templateDescription || "");
      if (templateDefinitionId) {
        formControl.setValue("settingDefinition", {
          label: templateDefinitionId,
          value: templateDefinitionId,
        });
        formControl.setValue("settingDefinitionId", templateDefinitionId);
      }
      if (templateInstance) {
        const rawJson = typeof templateInstance === "string" ? templateInstance : JSON.stringify(templateInstance, null, 2);
        formControl.setValue("settingInstanceJson", rawJson);
      }
    }
  }, [templateSelection, formControl]);

  useEffect(() => {
    if (definitionSelection?.value) {
      formControl.setValue("settingDefinitionId", definitionSelection.value);
    }
  }, [definitionSelection, formControl]);

  useEffect(() => {
    if (!settingInstanceJson) {
      formControl.setValue("settingInstance", undefined);
      return;
    }

    try {
      const parsed = JSON.parse(settingInstanceJson);
      formControl.setValue("settingInstance", parsed);
    } catch (error) {
      // Keep previous parsed value, validation will surface through the JSON field validator
    }
  }, [settingInstanceJson, formControl]);

  return (
    <Stack spacing={3}>
      <CippFormComponent type="hidden" name="settingDefinitionId" formControl={formControl} />
      <CippFormComponent type="hidden" name="settingInstance" formControl={formControl} />
      <Grid container spacing={3}>
        <Grid size={12}>
          <CippFormComponent
            type="autoComplete"
            name="TemplateList"
            label="Choose a Template"
            formControl={formControl}
            creatable={false}
            multiple={false}
            api={{
              excludeTenantFilter: true,
              url: "/api/ListReusableSettingTemplates",
              queryKey: "ListReusableSettingTemplates",
              labelField: (option) => option.DisplayName || option.displayName || option.GUID,
              valueField: "GUID",
              addedField: {
                displayName: "DisplayName",
                description: "Description",
                settingDefinitionId: "SettingDefinitionId",
                settingInstance: "SettingInstance",
              },
              showRefresh: true,
            }}
          />
        </Grid>

        <Grid size={12}>
          <CippFormComponent
            type="autoComplete"
            name="settingDefinition"
            label="Setting Definition"
            formControl={formControl}
            creatable={false}
            required
            api={{
              url: "/api/ListReusableSettingDefinitions",
              queryKey: "ListReusableSettingDefinitions",
              labelField: "displayName",
              valueField: "id",
            }}
          />
        </Grid>

        <Grid size={12}>
          <CippFormComponent
            type="textField"
            name="displayName"
            label="Reusable Setting Name"
            formControl={formControl}
            validators={{ required: "A display name is required" }}
          />
        </Grid>

        <Grid size={12}>
          <CippFormComponent
            type="textField"
            name="description"
            label="Description"
            formControl={formControl}
            multiline
            rows={2}
          />
        </Grid>

        <Grid size={12}>
          <CippFormComponent
            type="textField"
            name="settingInstanceJson"
            label="Setting Instance JSON"
            formControl={formControl}
            multiline
            rows={12}
            validators={{
              validate: (value) => getCippValidator(value, "json"),
            }}
          />
        </Grid>
      </Grid>

      <CippWizardStepButtons
        postUrl={postUrl}
        currentStep={currentStep}
        onPreviousStep={onPreviousStep}
        onNextStep={onNextStep}
        formControl={formControl}
      />
    </Stack>
  );
};
