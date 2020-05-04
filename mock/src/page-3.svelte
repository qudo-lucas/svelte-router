<div class="view">
    <div class="demo-card-square mdl-card mdl-shadow--2dp">
        <div class="mdl-card__title mdl-card--expand">
            <h2 class="mdl-card__title-text">Sub Routes</h2>
        </div>
        <div class="mdl-card__supporting-text">
        Three
        </div>
        <div class="mdl-card__actions mdl-card--border">
            <button on:click={() => router.send("page2")} class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored">
            Back
            </button>
        </div>
    </div>
</div>
<script>
export let router;
</script>