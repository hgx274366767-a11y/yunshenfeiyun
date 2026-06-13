"use strict";require("../common/vendor.js");const e=require("../polyfills/supabase-js.js");let s=null;exports.getSupabaseClient=function(){return s||(s=e.createClient()),s};
