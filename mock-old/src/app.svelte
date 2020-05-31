
<div class="container mdl-button--colored mdl-color--blue-600">
  <Router 
      initial="home"
      views={{
        home,
        usage,
        events,
        nested,
      }} 
  />
</div>

<script>
import Router from "svelte-event-router";

// Views
import home from "./views/home.svelte";
import usage from "./views/usage.svelte";
import events from "./views/events.svelte";
import nested from "./views/nested.svelte";
</script>

<style>
.container {
  box-sizing: border-box;
}
:global(.mdl-card) {
  width: 90vw !important;
  max-width: 800px;
}
:global(.mdl-card__supporting-text) {
  width: 100% !important;
}
:global(.mdl-card__supporting-text) {
  width: 100% !important;
  box-sizing: border-box;
}

:global(h3) {
  margin: 0;
}

:global(.bg-orange) {
  background-color: #fa3e01 !important;
}

:global(.option) {
  display: inline-block;
  padding: .5rem 1rem; 
  background: #dbdbdb;
  color: black;
  border-radius: 3px;
}

:global(.m-0) {
  margin: 0;
}

:global(table) {
  width: 100%;
}
:global(tr) {
  margin-top: 1rem;
  display: block;
}
:global(td,th) {
  min-width: 150px;
  text-align: left;
  vertical-align: top;
}

:global(.d-flex) {
  display: flex;
}

:global(.justify-content-between) {
  justify-content: space-between;
}
</style>