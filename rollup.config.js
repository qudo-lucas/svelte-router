import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
import json from "@rollup/plugin-json";
import injectProcessEnv from "rollup-plugin-inject-process-env";

const INPUT_DIR = "src";
const OUTPUT_DIR = "dist";

const production = !process.env.ROLLUP_WATCH;
const pkg = require("./package.json");

export default {
    // 😈😈😈😈🎉🎉🎉🎉
    inlineDynamicImports : true,
    
    input  : `${INPUT_DIR}/index.js`,
    output : [
        { file : pkg.module, format : "es" },
        {
            file : pkg.main, format : "umd", name : "Router",
        },
    ],
    plugins : [
        svelte({
            format : "esm",
        }),
        resolve({
            browser : false,
        }),
        commonjs(),
        json(),
    ],
};
