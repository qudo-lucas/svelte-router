# **Svelte Event Router**

A simple SPA router that enforces event driven user interfaces.
Your router does a lot for you. Chose a good one.

## **Why This One**
Svelte Event Router is an event driven router. Rather than going to a URL to update the view (while this does work), you send events to the router. This pattern of development results in well architected projects that are predictable and less prone to errors.

# **Getting Started**
To get started, import Router and specify your views.
```html
// app.svelte

<div class="container">
    <Router initial="home" {views} />
</div>

<script>
import Router from "svelte-event-router";

// Views
import home from "./views/home.svelte";
import usage from "./views/usage.svelte";
import events from "./views/events.svelte";
import nested from "./views/nested.svelte";

const views = {
    home,                   // url.com/#/home                      
    usage,                  // url.com/#/usage                        
    events,                 // url.com/#/events                 
    renamed : nested,       // url.com/#/renamed
}
</script>
```


# **The Router Component**
The router component serves as a state machine for your views. It catches events and handles rendering the correct component. 
```html
// auth.svelte

<Router
    initial="signin"
    base="auth"
    views={{
        signin,
        signup
    }}
/>

<script>
import Router from "svelte-event-router";
import signin from "./signin.svelte";
import signup from "./signup.svelte";
</script>
```
## **Options**
| Option        | Type          |  Description  |
|---|---|---|
| `initial`     | String (required)  | The initial route to load. This will also be the fallback URL for when a user tries to visit an invalid route on page load.|
| `base`        | String (required)  |  Primarily used in nested routers. This is the part of the URL that comes before your route name. Example: In url.com/auth/signup, "auth" would be the base and signup would be the route/view name.    |
| `views`       | Object (required)  |   An object full of components. The keys will become routes and the values are the components to be loaded.    |

# **The Router Instance**
```javascript
{
    send  : Function,
    event : Object, 
}
```
There are two ways to access a router instance.


### **From inside the router:**
Each view is passed the router instance as a prop. 
```html
<script>
export let router;
</script>
```
### **From outside the router:**
The router component exports prop `instance` which can be bound to local state.
```html
<Router
    bind:instance="{router}"
/>

<script>
import Router from "svelte-event-router";

let router;
</script>
```

# **Events**
Events allow you to communicate with a router instance. Events are used to update the current view, or communicate with other services.

## **Sending Events**
``` javascript
router.send((eventName : String, payload : Any)
```
In this example we send a "signup" event to the router. Since there is a view that matches the event name, the router will swap out the current component with the signup view. The URL will also be transitioned from `/signin` to `/signup`.

### **From inside the router:**
```html
// signin.svelte

<button on:click="{signup}">

<script>
export let router;

const signup = () => router.send("signup");
</script>
```

*Router setup for reference*
```html
// auth.svelte

<Router
    initial="signin"
    views={{
        signin,
        signup
    }}
/>

<script>
import Router from "svelte-event-router";
import signin from "./signin.svelte";
import signup from "./signup.svelte";
</script>
```

### **From outside the router:**
```html
// auth.svelte

<Router
    initial="signin"
    bind:instance="{router}"
    views={{
        signin,
        signup
    }}
/>

<script>
import Router from "svelte-event-router";
import signin from "./signin.svelte";
import signup from "./signup.svelte";

let router;

router.send("signup");
</script>
```


## **Listening For Events**

### **Subscribe to every event:**
If you want to be notified upon every event, you can subscribe to `router.event`.

``` javascript
router.event = {
    // Name of the last event
    name : String,

    // Payload from last event
    data : Any,

    // Payload from two events ago
    _event : Any,
}
```

``` html
<script>
export let router;

// Subscibe to all events
$: ({ event } = router);
$: console.log(`${event} just happened!`);
</script>
```
or
```html
// auth.svelte
<Router
    initial="signin"
    views={{
        signin,
        signup
    }}
/>

<script>
import Router from "svelte-event-router";

let router;

// Subscibe to all events
$: ({ event } = router);
$: console.log(`${event} just happened!`);
</script>
```

### **Subscribe to specific event:**
You can listen for specific events by placing listeners on the router component.

```html
// auth.svelte
<Router
    initial="signin"
    views="{{
        signin,
        signup
    }}"
    on:signup="{doTheThing}"
/>

<script>
import Router from "svelte-event-router";

let router;

const doTheThing = () => console.log("did it.");
</script>
```

### **Custom events:**
All router events are dispatched on the router component. If you send an event that doesn't have a corresponding view, the router will stay where it is and forward the event to the parent.

``` html
// signin.svelte

<script>
export let router;

router.send("success", { payload });
</script>
```

```html
// auth.svelte
<Router
    initial="signin"
    views="{{
        signin,
        signup
    }}"
    on:success="{doTheThing}"
/>

<script>
import Router from "svelte-event-router";

export let router;

const doTheThing = (event) => {
    const payload = event.detail.payload;

    console.log(payload);

    // transition parent router
    return router.send("home");
}
</script>
```

# **Nested Routers**
Sometimes you need routers inside routers inside routers inside routers. Svelte Event Route makes it easy and keep track of your router instances. Add a nested router by adding a router to one of your existing views. The only difference between setting up a nested router and top level router is that you need to supply a base.

```html
<Router
    {base}
    initial="signin"
    views={{
        signin,
        signup
    }} 
/>
<script>
import Router from "svelte-event-router";

// Views
import signin from "./views/signin.svelte";
import signup from "./views/signup.svelte";

// This tells the router to live at: url.com/#/users/auth/[here]
const base = "users/auth";
</script>

```

# **Questions?**

Find me on [Twitter](https://twitter.com/qudolucas)


