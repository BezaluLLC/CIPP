import { useEffect } from "react";
import { Grid } from "@mui/system";
import CippFormComponent from "/src/components/CippComponents/CippFormComponent";
import { useWatch } from "react-hook-form";
import { getCippValidator } from "/src/utils/get-cipp-validator";

const CippReusableSettingForm = (props) => {
  const { formControl, isEdit = false } = props;

  const selectedDefinition = useWatch({ control: formControl.control, name: "settingDefinition" });

  useEffect(() => {
    if (selectedDefinition && selectedDefinition.value) {
      formControl.setValue("settingDefinitionId", selectedDefinition.value);
    }
  }, [selectedDefinition, formControl]);

  return (
    <Grid container spacing={2}>
      <CippFormComponent type="hidden" name="settingDefinitionId" formControl={formControl} />
      <CippFormComponent type="hidden" name="settingId" formControl={formControl} />

      <Grid size={{ md: 6, xs: 12 }}>
        <CippFormComponent
          type="textField"
          label="Display Name"
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
          disabled={isEdit}
          helperText={
            isEdit
              ? "Setting definition cannot be changed after creation"
              : "Choose the reusable setting definition this instance is based on"
          }
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
          helperText="Paste the JSON payload returned by Graph for the setting instance."
        />
      </Grid>
    </Grid>
  );
};

export default CippReusableSettingForm;
