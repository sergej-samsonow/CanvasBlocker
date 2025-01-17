/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const extension = require("../lib/extension");
	const logging = require("../lib/logging");
	const settings = require("../lib/settings");
	const settingContainers = require("../lib/settingContainers");
	const lists = require("../lib/lists");
	require("../lib/theme").init();
	logging.message("Opened browser action");
	
	
	browser.tabs.query({active: true}).then(async function([currentTab]){
		function isWhitelisted(url){
			if (!(url instanceof URL)){
				url = new URL(url);
			}
			return lists.get("white").match(url) ||
				settings.get("blockMode", url).startsWith("allow");
		}
		
		const currentURL = new URL(currentTab.url);
		const reloadButton = document.getElementById("reload");
		reloadButton.addEventListener("click", async function(){
			await browser.tabs.reload(currentTab.id);
			window.close();
		});
		const addonStatus = document.getElementById("addonStatus");
		addonStatus.addEventListener("click", async function(){
			reloadButton.classList.toggle("hidden");
			if (isWhitelisted(currentURL)){
				settingContainers.resetUrlValue("blockMode", currentURL);
				if (settings.get("blockMode").startsWith("allow")){
					settings.set("blockMode", "fake", currentURL.host);
				}
				const entries = lists.get("white").filter(e => e.match(currentURL)).map(e => e.value);
				await Promise.all([
					lists.removeFrom("white", entries),
					lists.removeFrom("sessionWhite", entries)
				]);
			}
			else {
				settings.set("blockMode", "allowEverything", currentURL.hostname);
			}
			update();
		});
		function update(){
			if (isWhitelisted(currentURL)){
				addonStatus.className = "off";
				addonStatus.title = extension.getTranslation("browserAction_status_off");
			}
			else {
				addonStatus.className = "on";
				addonStatus.title = extension.getTranslation("browserAction_status_on");
			}
		}
		return settings.onloaded(update);
	}).catch(function(){});
	
	const actionDefinitions = [
		{
			label: "settings",
			icon: browser.extension.getURL("icons/pageAction-showOptions.svg"),
			action: function(){
				if (browser.runtime && browser.runtime.openOptionsPage){
					browser.runtime.openOptionsPage();
				}
				else {
					window.open(browser.extension.getURL("options/options.html"), "_blank");
				}
				window.close();
			}
		},
		{
			label: "faq",
			icon: browser.extension.getURL("icons/browserAction-faq.svg"),
			action: function(){
				window.open("https://canvasblocker.kkapsner.de/faq/", "_blank");
				window.close();
			}
		},
		{
			label: "test",
			advanced: true,
			icon: browser.extension.getURL("icons/browserAction-test.svg"),
			action: function(){
				window.open("https://canvasblocker.kkapsner.de/test", "_blank");
				window.close();
			}
		},
		{
			label: "review",
			icon: browser.extension.getURL("icons/browserAction-review.svg"),
			action: function(){
				window.open("https://addons.mozilla.org/firefox/addon/canvasblocker/reviews/", "_blank");
				window.close();
			}
		},
		{
			label: "reportIssue",
			icon: browser.extension.getURL("icons/browserAction-reportIssue.svg"),
			action: function(){
				window.open("https://github.com/kkapsner/CanvasBlocker/issues", "_blank");
				window.close();
			}
		},
	];
	settings.onloaded(async function(){
		const actions = document.getElementById("actions");
		actionDefinitions.forEach(function(action){
			logging.verbose("Action", action);
			if (action.advanced && !settings.displayAdvancedSettings){
				logging.verbose("Hiding advanced action");
				return;
			}
			const actionButton = document.createElement("button");
			actionButton.className = "action";
			
			const icon = document.createElement("span");
			icon.className = "icon";
			function setIcon(url){
				icon.style.maskImage = "url(" + url + ")";
			}
			setIcon(action.icon);
			
			actionButton.appendChild(icon);
			
			const textNode = document.createTextNode("");
			function setLabel(label){
				textNode.nodeValue = extension.getTranslation("browserAction_" + label) || label;
			}
			setLabel(action.label);
		
			actionButton.appendChild(textNode);
			actionButton.addEventListener("click", function(){
				action.action.call(this, {setIcon, setLabel});
			});
			actions.appendChild(actionButton);
		});
		
		const search = document.createElement("input");
		search.placeholder = extension.getTranslation("search");
		search.className = "search action";
		actions.appendChild(search);
		search.focus();
		
		search.addEventListener("keypress", function(event){
			if ([10, 13].indexOf(event.keyCode) !== -1){
				window.open(browser.extension.getURL(
					"options/options.html" +
					"?search=" +
					encodeURIComponent(this.value)
				));
				window.close();
			}
		});
	});
}());