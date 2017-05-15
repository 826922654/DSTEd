const electron		= require('electron');
const Remote		= electron.remote;
const DSTEd			= Remote.getGlobal('DSTEd');
const Editor		= require('../Classes/Editor.js');
const IPC			= require('electron').ipcRenderer;

(function IDE() {
	this.init = function init() {
		this.createMenu();
		this.createSidebar();
		
		document.addEventListener('click', function onClick(event) {
			const win = Remote.getCurrentWindow();
				
			if(typeof(event.target.dataset) != 'undefined' && typeof(event.target.dataset.action) != 'undefined') {
				switch(event.target.dataset.action) {
					case 'window:close':
						win.close();
					break
					case 'window:maximize':
						document.querySelector('button[data-action="window:maximize"]').dataset.action = 'window:restore';
						
						if(!win.isMaximized()) {
							win.maximize();
						} else {
							win.unmaximize();
						}
					break;
					case 'window:restore':
						win.restore();
						document.querySelector('button[data-action="window:restore"]').dataset.action = 'window:maximize';
					break;
					case 'window:minimize':
						if(!win.isMinimized()) {
							win.minimize();
						} else {
							win.unminimize();
						}
					break;
					case 'file:open':
						IPC.send('file:open', event.target.dataset.file);
					break;
				}
			}
		});
		
		IPC.on('workspace:projects', function(event, projects) {
			this.renderWorkspace(projects);
		}.bind(this));
		
		IPC.on('file:open', function(event, file) {
			console.log(file);
			_editor			= new Editor();		
			_editor.init(file.content, 'lua');
		}.bind(this));
	};
	
	this.createMenu = function createMenu() {
		const items	= Remote.Menu.getApplicationMenu().items;
		const menu	= document.querySelector('ui-menu');
		
		console.log('Render Menu', items);
		
		items.forEach(function(item) {
			var MenuItem			= document.createElement('ui-entry');
			var Button				= document.createElement('button');
			Button.innerHTML		= item.label;
			Button.disabled			= !item.enabled;
			
			MenuItem.appendChild(Button);
			if(typeof(item.submenu) != 'undefined' && item.submenu != null && typeof(item.submenu.items) != 'undefined' && item.submenu.items != null) {
				Button.classList.add('submenu');
				this.renderSubMenu(MenuItem, item.submenu.items);			
			}
			menu.appendChild(MenuItem);
		}.bind(this));
	};
	
	this.renderSubMenu = function renderSubMenu(target, items) {
		if(items.length > 0) {
			var Submenu			= document.createElement('ui-dropdown');
			
			items.forEach(function(submenu) {
				var SubmenuItem;
				
				/*console.log({
					accelerator:	submenu.accelerator,
					label:			submenu.label,
					checked:		submenu.checked,
					click:			submenu.click,
					commandId:		submenu.commandId,
					enabled:		submenu.enabled,
					icon:			submenu.icon,
					menu:			submenu.menu,
					role:			submenu.role,
					sublabel:		submenu.sublabel,
					type:			submenu.type,
					visible:		submenu.visible
				});*/
				
				switch(submenu.type) {
					case 'separator':
						SubmenuItem				= document.createElement('menu-seperator');
					break;
					default:
						var accelerator			= '';
						
						if(submenu.accelerator != null) {
							accelerator			= '<keyboard-shortcut>' + submenu.accelerator + '</keyboard-shortcut>';
						}
						
						SubmenuItem					= document.createElement('button');
						SubmenuItem.innerHTML		= submenu.label + accelerator;
						SubmenuItem.disabled		= !submenu.enabled;
						var command					= null;
						var command_id				= submenu.commandId;
						
						if(
							typeof(submenu.menu) != 'undefined' && submenu.menu != null &&
							typeof(submenu.menu.commandsMap) != 'undefined' && submenu.menu.commandsMap != null &&
							typeof(submenu.menu.commandsMap[command_id]) != 'undefined' && submenu.menu.commandsMap[command_id] != null &&
							typeof(submenu.menu.commandsMap[command_id].command) != 'undefined' && submenu.menu.commandsMap[command_id].command != null							
						) {
							command = submenu.menu.commandsMap[command_id].command;
						}
						
						SubmenuItem.dataset.command = command;
						
						SubmenuItem.addEventListener('click', function onClick() {
							console.log(this.dataset.command);
						});
					break;
				}
								
				Submenu.appendChild(SubmenuItem);
				
				if(typeof(submenu.submenu) != 'undefined' && submenu.submenu != null && typeof(submenu.submenu.items) != 'undefined' && submenu.submenu.items != null) {
					this.renderSubMenu(Submenu, submenu.submenu.items);			
				}
			}.bind(this));
			
			target.appendChild(Submenu);
		}
	};
	
	this.createSidebar = function createSidebar() {
		/* Resizing */
		var _sidebar			= document.body.querySelector('ui-content ui-workspace');
		
		if(_sidebar == null) {
			return;
		}
		
		var _handler		= document.createElement('resize-handler');
		var width			= _sidebar.getBoundingClientRect().width;
		var start			= 5;
		_sidebar.appendChild(_handler);
		_handler.style.left		= (width + start) + 'px';
		
		_handler.addEventListener('mousedown', function onMouseDown(event) {
			event.preventDefault();
			
			width			= _sidebar.getBoundingClientRect().width;
			var startDrag	= event.clientX;
			
			var onMouseMove = function onMouseMove(event) {
				var size					= width + -startDrag + event.clientX;
				_sidebar.style.width		= size + 'px';
				
				if(parseInt(_sidebar.style.width, 10) > 0) {
					_handler.style.left		= (size + start) + 'px';
				} else {
					event.stopPropagation();
				}
			};
			
			var onMouseUp = function onMouseUp(event) {
				var size						= 0;
				
				if(parseInt(_handler.style.left, 10) < size) {
					_handler.style.left		= (size + start) + 'px';
				}
				
				window.removeEventListener('mousemove', onMouseMove);
				window.removeEventListener('mouseup', onMouseUp);
			};
			
			window.addEventListener('mousemove', onMouseMove);
			window.addEventListener('mouseup', onMouseUp);
		});
	};
	
	var node				= 0;
	var subnode				= 0;
	
	this.renderWorkspace = function renderWorkspace(projects) {
		console.log('Render Workspace');
		var workspace_projects	= document.querySelector('ui-projects');
		
		Object.keys(projects).map(function(key, index) {
			subnode = 0;
			var project			= projects[key];
			var id				= 'node-' + ++node + '-' + subnode;
			var tree			= this.renderDirectory(project.files, '', true);
			var project_html	= '<project-entry class="css-treeview">';
			
			if(key.length > 0) {
				project_html += '<input type="checkbox" id="' + key + '">';
				project_html += '<label data-project="true" data-type="' + (project.workshop.enabled ? 'steam' : 'local') + '" for="' + key + '">';
				
				/* Steam nice name */
				if(project.workshop.enabled) {
					project_html += project.info.name + ' <small>(' + project.workshop.id + ')</small>';
				} else {
					project_html += key;
				}
				
				project_html += '</label>';
			}
			
			project_html += '<project-files>';
			project_html += tree.html;
			project_html += '</project-files>';
			project_html += '</project-entry>';
			workspace_projects.innerHTML += project_html;
		});
		
		/*try {
			const Application	= require('../Classes/Application.js');
			_app				= new Application();		
			_app.init();
		} catch(e) {
			console.log(e);
		}
		
		try {
			const Editor	= require('../Classes/Editor.js');
			
		} catch(e) {
			console.log(e);
		}*/
	};
	
	this.renderDirectory = function renderDirectory(files, html, first) {
		var id = 'node-' + node + '-' + ++subnode;
		var checkbox = '<input type="checkbox" id="' + id + '">';
		
		if(!first) {
			html += '<li>';
		}
		
		if(files.name.length > 0) {
			if(typeof(files.entries) != 'undefined' && files.entries.length > 0) {
				html += checkbox;
			}
			
			html += '<label for="' + id + '" data-type="' + files.type + '" data-directory="' + (files.directory ? 'true' : 'false') + '"' + (files.directory ? '' : ' data-action="file:open" data-file="' + files.path + files.name + '"') + '>' + files.name + '</label>';
		}
		
		if(typeof(files.entries) != 'undefined' && files.entries.length > 0) {
			html += '<ul>';
			
			files.entries.forEach(function(entries) {
				var result = this.renderDirectory(entries, '', false);
				html += result.html;
			});
			
			html += '</ul>';
		}
		
		if(!first) {
			html += '</li>';
		}
		
		return {
			html: 		html,
			id:			id,
			checkbox:	checkbox
		};
	};
	
	this.init();
}());