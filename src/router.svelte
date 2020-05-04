<svelte:component this={component} {router} />
<script>
import { onMount } from "svelte";

export let base = "";
export let initial;
export let views = {};

let _event;
let event;
let component;
let currentName;
let lastEvent;

// Used to test if we are able to match
// the current url with a component
const urls = new Map(
    Object.entries(views).map(([name, component]) => {
        const url = `#/${base}${base ? "/" : ""}${name}`;
        return [url, name];
    })
);

// Remove leading and trailing slashes
const sanitize = (str) => {
    return str.replace(/^\/|\/$/g, '');
}

const read = () => {
    const start = `#/${base}${base ? "/" :""}`;
    const hash = window.location.hash;
    const [ name ] = hash.replace(start, "").split("/");

    // // Put it back together
    const newUrl = `#/${base}${base ? "/" :""}${name}`;

    if(urls.has(newUrl)) {
        initial = urls.get(newUrl);
    }

    router.send(initial);
}

const router = {
    event : {},
    send  : (name = "", data = {}) => {
        let url = `#/${base}${base ? "/" : ""}${name}`;
        
        sanitize(name);
        
        // Test if we have a component for this url
        if(!urls.has(url)) {
            console.log(`Router: Non-existent event "${name}"`);
            console.log(`Router: Available events for this router`, Object.keys(views));
            component = component;
            
            return;
        }

        _event = router.event.data;

        // Leave existing
        if(name === currentName) {
            return component;
        }

        // Render new component
        component = views[name];
        currentName = name;


        // Add the url to the address bar.
        // Slap the event on the browser history real quick:
        // We do this so that in theory, you could hit the 
        // browser back button and the page would load with 
        // whatever state it hadthe last time it got an event.
        history.pushState({
            _event,
            data
        }, name, url);

        // Pull it off the browser history to make it available in component
        router.event =  history.state;
    },
};

window.onpopstate = () => read();

onMount(() => read());
</script>
