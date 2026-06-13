"use strict";const e=require("../utils/request.js");exports.calculatePrice=async function(t){return e.request.post("/pricing/calculate",t)};
