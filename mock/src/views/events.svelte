<View
{router}
title="Events"
next="nested"
nextName="NESTED ROUTERS"
back="usage"
>
    <div class="pb-4">
        <h6 class="mb-0"><strong>Sending Events</strong></h6>
        <p>Events allow you to update the current route as well as share data between routes. Each view component is passed an instance of <strong>router</strong> for quick access. To transition to another route, simply send the name of a view to the router. Events can also accept a payload to be received by the next route.<br><br><i>If you try to send an event that doesn't exist, the router will notify the console that you sent an invalid event and then fail silently. This way your app is only alowed to transition to where it can transition.</i></p>
        <p class="mt-3"><strong>events.svelte</strong></p>
        <pre>
            <code class="language-html">{
        `    
    <div class="events">
        <button on:click={back}>Back</button>
        <button on:click={next}>Nested Routes</button>
    </div>

    <script>
    export let router;

    // Transition to "usage" route
    const back = () => router.send("usage");

    // Transition to "nested" route with payload
    const next = () => router.send(
        "nested",
        { msg : "Message for next route"}
    );
    </script>
    `
            }</code>
        </pre>
    </div>
    <div class="py-4">
        <h6 class="mb-0"><strong>Receiving Events</strong></h6>
        <p>Each router instance has an event property that contains the payload of the last event. The <strong>_event</strong> property on  <strong>router.event</strong> contains the payload from two events ago.</p>
        <p class="mt-3"><strong>nested.svelte</strong></p>
        <pre>
            <code class="language-html">{
    `
    <p>Event Data: {event.msg}</h1>

    <script>
    export let router;
    const { event } = router;
    const lastLastEvent = event._event;
    </script>
    `
            }</code>
        </pre>
    </div>
</View>
<script>
export let router;
import View from "../components/view.svelte";
</script>

