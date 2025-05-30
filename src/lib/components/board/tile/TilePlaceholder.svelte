<script lang="ts">
import { fade } from "svelte/transition";
import {Tile} from "$lib/types/Tile.ts";
    import TileContent from "./TileContent.svelte";
    import { N_ROWS } from "$lib/constants.ts";
    import { boardState } from "$lib/state/boardState.svelte";
    import { noticeEvent, NoticeMessage, noticeState } from "$lib/state/noticeState.svelte";
    import { onDestroy, onMount, tick } from "svelte";
    import { uiState } from "$lib/state/uiState.svelte";
    import { statsState } from "$lib/state/statsState.svelte";
    import { backOut } from "svelte/easing";

const {
    tile = null,
    isInputRow = false,
    flipping = false,
    revealAnimationDelay = 0,
    hidden = false,
    x = null,
    y = null,
}: {
    tile?: Tile | null,
    isInputRow?: boolean,
    flipping?: boolean,
    revealAnimationDelay?: number,
    hidden?: boolean,
    x?: number | null,
    y?: number | null,
} = $props();

let isDoingGuessRejectShake = $state(false);

const handleMessage: EventListener = (event: Event) => {
    const {detail: message} = <CustomEvent<NoticeMessage>>event;

    if (
        !isInputRow
        || ![NoticeMessage.NotInWordList, NoticeMessage.AlreadyGuessedThisRound].includes(message)
    ) return;

    (async () => {
        isDoingGuessRejectShake = false;
        await tick();
        isDoingGuessRejectShake = true;
    })();
};

onMount(() => {
    noticeEvent.addEventListener("message", handleMessage);
});

onDestroy(() => {
    noticeEvent.removeEventListener("message", handleMessage);
});

let containerEl = $state<HTMLDivElement | null>(null);

const grow = (node: Element, {duration=250, delay=0, easing=backOut}: {duration?: number, delay?: number, easing?: (time: number) => number}={}) => {
    return {
        duration,
        delay,
        easing,
        css: (t: number) => `transform: scale(${Math.max(0, t)})`,
    };
};
</script>


<tile-placeholder-container
    style:grid-area={x !== null && y !== null ? `${N_ROWS - y}/${x + 1}` : ""}
    class:guess-reject-shake={isDoingGuessRejectShake}
    bind:this={containerEl}
    onanimationend={(event: Event) => event.target === containerEl && (isDoingGuessRejectShake = false)}
>
    <tile-placeholder
        class:filled={isInputRow && (tile?.letter.length ?? 0) > 0}
        class:flipping
        class:hidden
        class:paused={uiState().paused}
        style:--reveal-animation-delay="{revealAnimationDelay}ms"
        class:is-first-guess={statsState().isFirstGuess}
    >
        {#if tile !== null && isInputRow && !uiState().paused && tile.letter.length > 0}
            <tile-text transition:grow>{tile.letter}</tile-text>
        {/if}
    </tile-placeholder>


    {#if tile !== null && isInputRow && flipping}
        <TileContent
            {tile}
            {flipping}
            {revealAnimationDelay}
            {isInputRow}
            x={x ?? 0}
            y={y ?? 0}
        />
    {/if}
</tile-placeholder-container>


<style lang="scss">
tile-placeholder-container {
    width: var(--tile-size);
    height: var(--tile-size);
    font-size: 2rem;

    display: grid;
    place-items: stretch;

    > :global(*) {
        grid-area: 1/1;
    }

    transform-style: preserve-3d;
}

tile-placeholder {
    display: grid;
    place-items: center;

    transition:
        outline 0.125s ease-in-out,
        outline-offset 0.075s ease-in-out,
        opacity 0.175s ease-in-out;
    outline: 2px solid #aaa;
    outline-offset: -0.5rem;

    backface-visibility: hidden;


    &.paused {
        opacity: 0.125;
    }

    &:not(.paused) {
        &.filled {
            outline: 2px solid var(--off-black);
            outline-offset: 0;
            animation: pulse .175s ease-in-out;
            @keyframes pulse {
                20% {
                    transform: scale(1.125);
                }
            }
        }

        &.hidden {
            opacity: 0.5;
            &.is-first-guess {
                transition-delay: 3s;
            }
        }


        &.flipping {
            animation: flip-bg 0.5s ease-in-out forwards;
            animation-delay: var(--reveal-animation-delay);

            &.is-first-guess {
                animation-duration: var(--tile-flip-duration-first-guess);
            }
            
            @keyframes flip-bg {
                0% {
                    transform: rotateX(0turn);
                }
                50% {
                    outline-offset: 0rem;
                    outline-color: var(--off-black);
                }
                100% {
                    transform: rotateX(-0.5turn);
                    outline-offset: -2rem;
                    outline-color: #0000;
                }
            }
        }
    }
}

.guess-reject-shake {
    animation: shake 0.5s ease-in-out;

    @keyframes shake {
        14.28571% {
            transform: translateX(0.5rem);
        }
        28.57143% {
            transform: translateX(-0.7rem);
        }
        42.85714% {
            transform: translateX(0.8rem);
        }
        57.14286% {
            transform: translateX(-0.8rem);
        }
        71.42857% {
            transform: translateX(0.7rem);
        }
        85.71429% {
            transform: translateX(-0.5rem);
        }
    }
}

</style>

