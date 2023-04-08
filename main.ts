import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	addIcon,
	Vault,
	requestUrl
} from 'obsidian';
// import { store } from 'obsidian';
var request = require('request');
var https = require('https');
// var unzip = require('unzip')
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');



// Remember to rename these classes and interfaces!

interface AskifyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: AskifyPluginSettings = {
	mySetting: 'default'
}

async function unzipFile(filePath, destPath) {
	try {
		
		let fileExists = fs.existsSync(filePath)
		
		const zip = new AdmZip(filePath);

		zip.extractAllTo(destPath, true);
	} catch (e) {
		console.log("error in unzipping the file")
		console.log(e);
	}
	console.log("unzip is complete")

}

export default class MyPlugin extends Plugin {
	settings: AskifyPluginSettings;

	async onload() {
		console.log("plugin loadded..");
		await this.loadSettings();
		// This creates an icon in the left ribbon.
		// addIcon("sync", `<sync    <circle cx="50" cy="50" r="50" fill="currentColor" />`);
		addIcon("circle", `<circle fill="#000000" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M19.91,15.51H15.38a1,1,0,0,0,0,2h2.4A8,8,0,0,1,4,12a1,1,0,0,0-2,0,10,10,0,0,0,16.88,7.23V21a1,1,0,0,0,2,0V16.5A1,1,0,0,0,19.91,15.51ZM12,2A10,10,0,0,0,5.12,4.77V3a1,1,0,0,0-2,0V7.5a1,1,0,0,0,1,1h4.5a1,1,0,0,0,0-2H6.22A8,8,0,0,1,20,12a1,1,0,0,0,2,0A10,10,0,0,0,12,2Z"></path></g>`);
		console.log("trying to load the ribbion")
		const ribbonIconEl = this.addRibbonIcon('circle', 'Askify Sync Plugin', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Sync started');

		
			const mySettingValue = await this.loadData();
			if(mySettingValue==''){
				new Notice('Please add the Askify sync key in the plugin settings.');
				return
			}

			console.log('Value of "mySettingKey":', mySettingValue);
			// return;

			const fs = require('fs');
			const {
				vault
			} = this.app;
	
			
			//Step 1. Create file and get its name from cloud storage 
			let sync_key = mySettingValue.mySetting;
			console.log("current sync key is "+ sync_key);
			let fileName = await this.getNotesZipFileName(sync_key);
			let fileUrl = "https://storage.googleapis.com/temporary_exports/" + fileName
			console.log("file url recieved");
			console.log(fileUrl);
			//Step 2 : Download the file as zip
			await this.downloadAskifyNotesAsZip(vault, fileUrl, fileName);
	
	
			//@ts-ignore
			let folderPath = this.app.vault.adapter.basePath;
			let filePath = folderPath + "/" + fileName;
			console.log("file path = " + filePath);
	
	
	
		
	
			// Step 3: create a folder of Askify
			try {
				await vault.createFolder('Askify')
			} catch (e) {
				console.log("error in creating the folder")
				console.log(e);
			}
			let unzip_folder = folderPath + '/Askify/'
			console.log("unzip folder = " + unzip_folder)
	
			// Step 4: unzip file in the Askify folder
			await unzipFile(filePath, unzip_folder);
	
			//Step 5: delete the zip file
			try {
				
				let deleteRes = await vault.delete(fileName);
				
				let fsDeletion = fs.unlinkSync(filePath);
		
			
			} catch (e) {
				console.log("error in deleting the file")
				console.log(e);
			}

			new Notice('Sync complete');
		});
		
		
	
	}

	private async getNotesZipFileName(apikey) {
		// var axios = require('axios');
		var data = JSON.stringify({
			"apiKey": apikey
		});

		var config = {
			method: 'post',
			url: 'https://us-central1-talk-to-videos.cloudfunctions.net/obsidianPluginSync',
			headers: {
				'Content-Type': 'application/json'
			},
			data: data
		};

		let resp = await requestUrl(config);
		console.log("resp is ");
		console.log(resp);
		console.log("json response is ");
		console.log(resp.json);
		return resp.json;
	}

	private downloadAskifyNotesAsZip(vault, fileUrl, fileName) {
		// return new Promise((resolve) => {
		// 	console.log("starting the download")
		// 	https.get(fileUrl).on('response', function (response) {
		// 		// var body = '';
		// 		let binaryData = Buffer.alloc(0);
		// 		var i = 0;
		// 		response.on('data', function (chunk) {
		// 			i++;
		// 			// body += chunk;
		// 			binaryData = Buffer.concat([binaryData, chunk]);
		// 			console.log('BODY Part: ' + i);
		// 		});
		// 		response.on('end', async function () {
		// 			// console.log(body);
		// 			console.log('Finished');
		// 			// fs.writeFileSync('test5.zip', binaryData);
		// 			await vault.createBinary(filename, binaryData);
		// 			resolve("success")
		// 		});
		// 	});
		// });

		let fileData: ArrayBuffer; 
		return new Promise(async (resolve) => {
			console.log("starting the download");
			fileData = await requestUrl({url: fileUrl}).arrayBuffer;

			if(fileData!=null){
				vault.createBinary(fileName, fileData);
			}
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// console.log("loading settings and value is ");
		// console.log(this.settings.mySetting);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {
			contentEl
		} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {
			contentEl
		} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {
			containerEl
		} = this;

		containerEl.empty();

		containerEl.createEl('h2', {
			text: 'Settings for Askify Sync plugin.'
		});

		new Setting(containerEl)
			.setName('Askify Obsidian sync key')
			.setDesc('Get this key from the Askify website')
			
			.addText(text => text
				.setPlaceholder('Enter your key')
				.setValue(this.plugin.settings.mySetting)
				
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
