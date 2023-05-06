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
	TFolder,
	addIcon,
	Vault,
	requestUrl,
	TAbstractFile
} from 'obsidian';

import AdmZip from 'adm-zip';

// Remember to rename these classes and interfaces!

interface AskifyPluginSettings {
	AskifySyncKeySetting: string;
}

const ASKIFY_DEFAULT_SETTINGS: AskifyPluginSettings = {
	AskifySyncKeySetting: 'default'
}

async function unzipFile(filePath, destPath) {
	try {
		
		const zip = new AdmZip(filePath);

		zip.extractAllTo(destPath, true);
	} catch (e) {
		console.log("error in unzipping the file")
		console.log(e);
	}
	console.log("unzip is complete")

}

export default class AskifyPlugin extends Plugin {
	settings: AskifyPluginSettings;

	async onload() {
		console.log("plugin loadded..");
		await this.loadSettings();

		console.log("trying to load the ribbion")
		const ribbonIconEl = this.addRibbonIcon('circle', 'Askify Sync Plugin', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Askify Sync started');

		
			const askifySyncVal = await this.loadData();
			
			if(askifySyncVal==null ||askifySyncVal.AskifySyncKeySetting=='' || askifySyncVal.AskifySyncKeySetting=='default'){
				new Notice('Askify Sync Failed! Please add the Askify sync key in the plugin settings.');
				return
			}

		

			const {
				vault
			} = this.app;
	
			
			//Step 1. Create file and get its name from cloud storage 
			
			let sync_key = askifySyncVal.AskifySyncKeySetting; 
	
			let zipFileName = await this.getNotesZipFileName(sync_key);
			let fileUrl = "https://storage.googleapis.com/temporary_exports/" + zipFileName
		
			//Step 2 : Download the file as zip
			//before downloading delete the file if it exists 
			const files = this.app.vault.getFiles()

			const file = this.app.vault.getAbstractFileByPath(`${zipFileName}`)
			if (file) {
				this.app.vault.delete(file);
			}
			await this.downloadAskifyNotesAsZip(vault, fileUrl, zipFileName);
	
	
			//@ts-ignore
			let folderPath = this.app.vault.adapter.basePath;
			let zipFilePath = folderPath + "/" + zipFileName;
		
	
			// Step 3: create a folder of Askify
			try {
				if( !(this.app.vault.getAbstractFileByPath('Askify') instanceof TFolder) ){
					await vault.createFolder('Askify')
				}
			} catch (e) {
				console.log("error in creating the folder")
				console.log(e);
			}
			let unzip_folder = folderPath + '/Askify/'
	
			// Step 4: unzip file in the Askify folder
			await unzipFile(zipFilePath, unzip_folder);
	
			//Step 5: delete the zip file
			
			
			const file2 = this.app.vault.getAbstractFileByPath(`${zipFileName}`)
			if (file2) {
				this.app.vault.delete(file2);
			}else{
				console.log("Unable to delete file");
			}
			new Notice('Sync complete');
		});
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new AskifySettingTab(this.app, this));
		
	
	}

	private async getNotesZipFileName(apikey) {
		var data = JSON.stringify({
			"apiKey": apikey
		});

		var config = {
			method: 'post',
			url: 'https://us-central1-talk-to-videos.cloudfunctions.net/obsidianPluginSync',
			headers: {
				'Content-Type': 'application/json'
			},
			body: data
		};

		try{
			let resp = await requestUrl(config);
			console.log("resp is ");
			console.log(resp);
			
			console.log("json response is ");
			console.log(resp.text);
			return resp.text;
		}catch(e){
			new Notice('Please add correct Askify sync key');
		}
		
	}

	private downloadAskifyNotesAsZip(vault, fileUrl, fileName) {

		let fileData: ArrayBuffer; 
		return new Promise(async (resolve) => {
			console.log("starting the download");
			const response = await requestUrl({url: fileUrl});
			fileData = response.arrayBuffer;

			if(fileData!=null){
				console.log("file data is not null and file name is "+ fileName);
				try{
				await vault.createBinary(fileName, fileData);
				}
				catch(e){
					console.log("error in creating file");
					console.log(e);
				}
				console.log("file created");
				resolve("success");
			}else{
				console.log("fie data is null");
				resolve("error");
			}
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, ASKIFY_DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class AskifySettingTab extends PluginSettingTab {
	plugin: AskifyPlugin;

	constructor(app: App, plugin: AskifyPlugin) {
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
				.setValue(this.plugin.settings.AskifySyncKeySetting)
				
				.onChange(async (value) => {
				
					this.plugin.settings.AskifySyncKeySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
