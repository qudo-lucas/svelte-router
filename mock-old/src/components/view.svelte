<div class="view d-flex py-6 {centered ? 'align-self-center' : ""}">
    <div class="demo-card-square mdl-card mdl-shadow--2dp">
        <div class="mdl-card__supporting-text">
            <div class="header d-flex justify-content-between align-items-center py-1">
                <h1 class="m-0">{title}</h1>
                <div class="nav">
                    {#if back}
                    <button on:click={() => router.send(back)} class="
                        mdl-button
                        mdl-js-button
                        mdl-button--raised">
                    Back
                    </button>
                    {/if}
                    {#if next}
                    <button on:click={() => router.send(next)} class="
                        mdl-button
                        mdl-js-button
                        mdl-button--raised
                        mdl-button--colored
                        bg-orange
                        ml-1">
                    {nextName}
                    </button>
                    {/if}
                </div>
            </div>
            <hr>
            <slot></slot>
        </div>
    </div>
</div>

<!-- A little janky but this script tag needs to rerun for every route so this way it gets created and destroyed each time -->
<Prism />

<script>
import Prism from "./prism.svelte";
export let router;
export let title = "";
export let next = "";
export let nextName = "";
export let back = "";
export let centered = false;
</script>

<style>
.view {
  width: 100vw;
  display: inline-flex;
  justify-content: center;
  box-sizing: border-box;
}
</style>