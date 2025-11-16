export enum LightDark {
    Light,
    Dark,
    MatchSystem,
}


const settingsStateDefaults = {
    matchTileColor: "#66a166",
    misplacedTileColor: "#bbb660",
    absentTileColor: "#7c7c81",

    bgFrozen: false,

    lightDark: LightDark.MatchSystem,
};


const LOCAL_STORAGE_KEY = "pudle";

export class SettingsState {
    matchTileColor = $state(settingsStateDefaults.matchTileColor);
    misplacedTileColor = $state(settingsStateDefaults.misplacedTileColor);
    absentTileColor = $state(settingsStateDefaults.absentTileColor);

    bgFrozen = $state(settingsStateDefaults.bgFrozen);

    lightDark = $state(settingsStateDefaults.lightDark);


    revertToDefaults() {
        Object.assign(this, settingsStateDefaults);
    }

    setupPersistentSettings() {
        const existingSettingsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (existingSettingsJson !== null) {
            Object.assign(this, JSON.parse(existingSettingsJson));
        }

        $effect.root(() => {
            $effect(() => {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                    matchTileColor: this.matchTileColor,
                    misplacedTileColor: this.misplacedTileColor,
                    absentTileColor: this.absentTileColor,
                    bgFrozen: this.bgFrozen,
                    lightDark: this.lightDark,
                }));
            });
        });
    }
}

export const settingsState = new SettingsState();
