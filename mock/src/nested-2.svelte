<p>
    Another nested router.
</p>
<button on:click={() => router.send("nested1")} class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">
  Nested 1
</button>
<button on:click={() => router.send("nested2")} class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">
  Nested 2
</button>
<button on:click={() => router.send("nested3")} class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">
  Nested 3
</button>

<script>
    export let router;
</script>