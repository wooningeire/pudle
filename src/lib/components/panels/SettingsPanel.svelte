<script lang="ts">
import { LightDark, settingsState } from "@/lib/state/settingsState.svelte";
import { cubicInOut, cubicOut } from "svelte/easing";
import { fly } from "svelte/transition";
    import Button from "./widgets/parts/Button.svelte";
    import SettingsSeparator from "./SettingsSeparator.svelte";

</script>

<settings-panel transition:fly={{duration: 250, y: 25, easing: cubicInOut}}>
    <input
        type="color"
        bind:value={settingsState.matchTileColor}
        id="color_match"
    />

    <label for="color_match">
        Match tile color
    </label>


    <input type="color" bind:value={settingsState.misplacedTileColor} id="color_misplaced" />

    <label for="color_misplaced">
        Misplaced tile color
    </label>


    <input type="color" bind:value={settingsState.absentTileColor} id="color_absent" />

    <label for="color_absent">
        Absent tile color
    </label>

    <SettingsSeparator />

    <input
        type="radio"
        name="light-dark"
        bind:group={settingsState.lightDark}
        value={LightDark.Light}
        id="light-dark_light"
    />

    <label for="light-dark_light">
        Light
    </label>

    <input
        type="radio"
        name="light-dark"
        bind:group={settingsState.lightDark}
        value={LightDark.Dark}
        id="light-dark_dark"
    />

    <label for="light-dark_dark">
        Dark
    </label>

    <input
        type="radio"
        name="light-dark"
        bind:group={settingsState.lightDark}
        value={LightDark.MatchSystem}
        id="light-dark_match-system"
    />

    <label for="light-dark_match-system">
        Match system
    </label>

    <SettingsSeparator />

    <input type="checkbox" bind:checked={settingsState.bgFrozen} id="bg-frozen" />

    <label for="bg-frozen">
        Freeze background
    </label>



    <Button
        onClick={() => settingsState.revertToDefaults()}
        moveDirection="up"
    >reset</Button>

</settings-panel>

<style lang="scss">
* {
    transform-style: preserve-3d;
}

settings-panel {
    grid-area: 2/2 / 6/3;

    position: relative;


    display: grid;
    grid-template-columns: auto auto;
    align-items: center;

    gap: 1.5rem 0.5rem;
    font-size: 1.5rem;
}

input {
    justify-self: center;
}

input[type="checkbox"],
input[type="radio"] {
    width: 2rem;
    height: 2rem;
    accent-color: var(--tile-match);
}

:global(button-container) {
    grid-column: 1 / -1;
}
</style>