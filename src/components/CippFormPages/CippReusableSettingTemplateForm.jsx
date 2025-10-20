import { useEffect } from "react";
import { Grid } from "@mui/system";
import CippFormComponent from "/src/components/CippComponents/CippFormComponent";
import { useWatch } from "react-hook-form";
import { getCippValidator } from "/src/utils/get-cipp-validator";

const CippReusableSettingTemplateForm = (props) => {
  const { formControl } = props;

  const selectedDefinition = useWatch({ control: formControl.control, name: "settingDefinition" });

  useEffect(() => {
    if (selectedDefinition && selectedDefinition.value) {
      formControl.setValue("settingDefinitionId", selectedDefinition.value);
    }
  }, [selectedDefinition, formControl]);

  return (
    <Grid container spacing={2}>
      <CippFormComponent type="hidden" name="GUID" formControl={formControl} />
      <CippFormComponent type="hidden" name="settingDefinitionId" formControl={formControl} />

      <Grid size={{ md: 6, xs: 12 }}>
        <CippFormComponent
          type="textField"
          label="Template Name"
          name="displayName"
          required
          formControl={formControl}
          fullWidth
        />
      </Grid>
      <Grid size={{ md: 6, xs: 12 }}>
        <CippFormComponent
          type="textField"
          label="Description"
          name="description"
          formControl={formControl}
          fullWidth
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <CippFormComponent
          type="autoComplete"
          name="settingDefinition"
          label="Setting Definition"
          required
          creatable={false}
          formControl={formControl}
          api={{
            url: "/api/ListReusableSettingDefinitions",
            queryKey: "ListReusableSettingDefinitions",
            labelField: "displayName",
            valueField: "id",
          }}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <CippFormComponent
          type="textField"
          name="settingInstanceJson"
          label="Setting Instance JSON"
          formControl={formControl}
          required
          multiline
          rows={12}
          validators={{
            validate: (value) => getCippValidator(value, "json"),
          }}
          helperText="Provide the JSON payload that should be stored with this template."
        />
      </Grid>
    </Grid>
  );
};

export default CippReusableSettingTemplateForm;
