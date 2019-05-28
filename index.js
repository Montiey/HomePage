const express = require("express");
var app = express();
const fs = require("fs");
const port = 8000;
const panelsPath = "panels";

const insertTag = "{{BLOCKINSERT}}";
const thumbDataTag = "{{THUMB64}}";

const blockTemplateFile = "block.html.template";
const templateFile = "index.html.template";

//const recompileInterval = 240000;
const recompileInterval = 0;
var lastCompileTime = 0;
var compiledTemplate = "";

String.prototype.replaceAll = function(tar, repl){
	var tmp = this;
	while(tmp.indexOf(tar) != -1){
		tmp = tmp.replace(tar, repl);
	}
	return tmp;
};

function getPanels(){
	console.log("Updating panel cache");
	var panels = [];
	var dirs = [];
	try{
		dirs = fs.readdirSync(panelsPath).filter(function (file) {
			return fs.statSync(panelsPath + "/" + file).isDirectory();
		});
	} catch(e){
		console.log("Couldn't read the panels directory");
	}
	for(var dirLink of dirs){
		try{
			console.log("Getting panel for " + panelsPath + "/" + dirLink);
			var realPath = fs.readlinkSync(panelsPath + "/" + dirLink);
			var configFile = fs.readFileSync(realPath + "/panel.json");
			var config = JSON.parse(configFile);
			var newPanel = fs.readFileSync(blockTemplateFile).toString();
			for(var set of config.templateTags){
				//while(newPanel.indexOf(set.tag) != -1){
				//	var tagIndex = newPanel.indexOf(set.tag);
				//	newPanel = newPanel.slice(0, tagIndex) + set.value + newPanel.slice(tagIndex + set.tag.length, newPanel.length);
				//}
				newPanel = newPanel.replaceAll(set.tag, set.value);
			}
			
			try{
				var image = fs.readFileSync(realPath + "/thumb.png");
				var data = image.toString("base64");
				newPanel = newPanel.replaceAll(thumbDataTag, data);
			} catch(e){
				console.log("Couldn't load thumbnail");
			}


			panels.push(newPanel);
		} catch(e){
			console.log("Couldn't read panel.json from " + dirLink + ": " + e);
		}
	}
	compiledTemplate = fs.readFileSync(templateFile).toString();
	//var insertIndex = compiledTemplate.indexOf(insertTag);
	//compiledTemplate = compiledTemplate.slice(0, insertIndex) + compiledTemplate.slice(insertIndex + insertTag.length, compiledTemplate.length);
	var allPanels = "";
	for(var panel of panels){
		allPanels += panel;
		//compiledTemplate = compiledTemplate.slice(0, insertIndex) + panel + compiledTemplate.slice(insertIndex, compiledTemplate.length);
	}
	compiledTemplate = compiledTemplate.replaceAll(insertTag, allPanels);
}

getPanels();

app.use("/", express.static("pub"));

app.get("/", function(req, res){
	if(Date.now() - lastCompileTime > recompileInterval){
		console.log("Recompiling html");
		lastCompileTime = Date.now();
		getPanels();
	}
	res.send(compiledTemplate);
});

app.listen(port, function(){
	console.log("Panels Server started on port " + port);
});
