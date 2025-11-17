<script lang="ts">
    import Background from "@/lib/components/Background.svelte";
import GamePage from "@/lib/components/GamePage.svelte";
    import { LightDark, settingsState } from "@/lib/state/settingsState.svelte";
    import { statsState } from "@/lib/state/statsState.svelte";
    import { onMount } from "svelte";


let mainEl = $state<HTMLElement | null>(null);

let mainElWidth = $state<number | null>(null);
let mainElHeight = $state<number | null>(null);

const bgWidth = $derived(mainElWidth ?? 0);
const bgHeight = $derived(mainElHeight ?? 0);

const resize = () => {
    mainElWidth = mainEl?.offsetWidth ?? innerWidth;
    mainElHeight = mainEl?.offsetHeight ?? innerHeight;
};

onMount(resize);

onMount(() => {
    settingsState.setupPersistentSettings();
});
</script>

<svelte:window onresize={resize} />

<main
    bind:this={mainEl}
    class:light-dark_light={settingsState.lightDark === LightDark.Light}
    class:light-dark_dark={settingsState.lightDark === LightDark.Dark}
    class:light-dark_match-system={settingsState.lightDark === LightDark.MatchSystem}
    style:--tile-match={settingsState.matchTileColor}
    style:--tile-misplaced={settingsState.misplacedTileColor}
    style:--tile-absent={settingsState.absentTileColor}
>
    {#if !statsState().isFirstGuess}
        <Background
            width={bgWidth}
            height={bgHeight}
        />
    {/if}
    
    <GamePage />
</main>

<style lang="scss">
:global(:root):has(main.light-dark_light) {
    color-scheme: light;
}

:global(:root):has(main.light-dark_dark) {
    color-scheme: dark;
}

main {
    display: grid;
    place-items: center;
    
    min-width: 100vw;
    height: 100vh;

    perspective: 50rem;
    // overflow: hidden;

    color: var(--off-black);

    > :global(*) {
        grid-area: 1/1;
    }
}

:global(a) {
    --tile-match-dark: oklch(from var(--tile-match) calc(l - 0.1) c h);

    color: light-dark(var(--tile-match-dark), var(--tile-match));

    text-decoration: none;
    border-bottom: currentcolor 2px solid;

    &:hover,
    &:focus {
        color: oklch(from light-dark(var(--tile-match-dark), var(--tile-match)) calc(l + 0.1) c h);
    }

    &:active {
        color: var(--off-black);
    }
}

:global(.light-dark_dark a) {
    filter: drop-shadow(0 0.0625rem 0.5rem oklch(from currentcolor l c h / 0.5));
}

@media (prefers-color-scheme: dark) {
    :global(.light-dark_match-system a) {
        filter: drop-shadow(0 0.0625rem 0.5rem oklch(from currentcolor l c h / 0.5));
    }
}

:global(button) {
    display: block;
    border: none;
    font-family: inherit;
    font-size: 1em;
    color: inherit;
}
</style>