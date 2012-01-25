
Ext.namespace('Ext.ux');

/**
 * Ext.testia.ListPanel extension class
 *
 * @class Ext.testia.ListPanel
 * @extend Ext.ContentPanel
 *
 * @constructor
 * Creates new Ext.testia.ListPanel
 * @param {String/HTMLElement/Element} el The container element for this panel
 * @param {Object} config
 * @param {Boolean} config.deletedFolder Should deleted items folder be added
 *   in the beginning of the list. Default true.
 * @param {Boolean} config.tagging Is tagging enabled, default true
 * @param {Boolean} config.toggleSelection If true item's selected mode changes
 *   to unselected only when item is clicked. Default false.
 * @param {Boolean} config.acceptDrops Accept dnd items from external panels.
 *   Default true.
 * @param {Boolean} config.showListPath Display listpath on top of panel.
 *   Default true.
 * @param {Boolean} initial_load Should load method be called in the end of the
 *                               constructor. Default true.
 * @param {String} config.cls CSS classes for el.
 */
Ext.ux.ListPanel = function(el, config, initial_load) {
    config = config || el;

    var url;
    var itemUrl;
    var archiveUrl;
    var createCMenu;
    var search;
    var toolbarEnabled;
    var tagging;
    if (config) {
        if (config.deletedFolder !== undefined) {
            this.deletedFolder = config.deletedFolder;
            delete(config.deletedFolder);
        } else { // Default value
            this.deletedFolder = true;
        }
        if (config.treeUrl) {
            url = config.treeUrl;
            delete(config.treeUrl);
        }
        if (config.itemUrl) {
            itemUrl = config.itemUrl;
            delete(config.itemUrl);
        }
        if (config.archiveUrl) {
            archiveUrl = config.archiveUrl;
            delete(config.archiveUrl);
        }
        if (config.ddGroup) {
            this.ddGroup = config.ddGroup;
            delete(config.ddGroup);
        } else {
            this.ddGroup = 'group';
        }
        if (config.cmenuEnabled !== undefined) {
            createCMenu = config.cmenuEnabled;
            delete(config.cmenuEnabled);
        } else { // Default value
            createCMenu = true;
        }
        // Should search/filter text field be enabled. Default == true
        if (config.searchEnabled !== undefined) {
            search = config.searchEnabled;
            delete(config.searchEnabled);
        } else { // Default value
            search = true;
        }
        // Should separate toolbar be enabled. Default == true
        if (config.toolbarEnabled !== undefined) {
            toolbarEnabled = config.toolbarEnabled;
            delete(config.toolbarEnabled);
        } else { // Default value
            toolbarEnabled = true;
        }
        if (config.tagging !== undefined) {
            tagging = config.tagging;
            delete(config.tagging);
        } else {
            tagging = true;
        }
        if (config.acceptDrops !== undefined) {
            this.acceptDrops = config.acceptDrops;
            delete(config.acceptDrops);
        } else {
            this.acceptDrops = true;
        }
        if (config.showListPath !== undefined) {
            this.showListPath = config.showListPath;
            delete(config.showListPath);
        } else {
            this.showListPath = true;
        }
        if (config.toggleSelection) {
            this.toggleSelection = config.toggleSelection;
            delete(config.toggleSelection);
        }
        if (config.toolbarTitle) {
            this.toolbarTitle = config.toolbarTitle;
            delete(config.toolbarTitle);
        }
    }
    // parent constructor
    Ext.ux.ListPanel.superclass.constructor.call(this, el, config);
    if (config && config.cls) {
        Ext.fly(el).addClass(config.cls);
    }


    this.url = url;
    this.itemUrl = itemUrl;
    this.archiveUrl = archiveUrl;
    this.selectedItems = [];

    this.addEvents({
        "click": true,
        "itemselect": true,
        "beforeclick": true,
        "contextmenu": true,
        "dragdrop": true,
        "itemsadded": true,
        "itemsmoved": true
    });

    this.on('itemselect', function(item, e) {
        // 1. jos shift, haetaan selectedItems.last ja item väliin
        //    jäävät
        //    Muuten vain item
        // 2. Jos ctrl niin lisätään, muuten korvataan
        var nselections = [];
        var i;
        if (this.selectedItems === undefined) {this.selectedItems = [];}

        if (e.shiftKey && (this.selectedItems.size() > 0)) {
            var a = this.items.indexOf(item);
            var b = this.items.indexOf(this.selectedItems.last());
            if (a > b) {
                i=a; a=b; b=i; // swap a and b
            }
            for (i=a;i<=b;++i) {
                nselections.push(this.items[i]);
            }
        } else {
            nselections.push(item);
        }

        if (e.ctrlKey || this.toggleSelection) {
            // togles selected status for clicked items
            for (i=0;i<nselections.length;) {
                if (nselections[i].selected) {
                    nselections[i].unselect();
                    this.selectedItems.splice(
                        this.selectedItems.indexOf(nselections[i]), 1);
                    nselections.splice(i,1);
                } else {
                    nselections[i].select();
                    i++;
                }
            }
            this.selectedItems = this.selectedItems.concat(nselections);
        } else {
            Ext.each(this.selectedItems, function(i) {
                i.unselect();
            });
            this.selectedItems = nselections;
        }

        Ext.each(this.selectedItems, function(i) {
            i.select();
        });
    }, this);

    this.on('click', function(item, e) {
        if (e.ctrlKey || e.shiftKey) {
            // Prevent opening new tabs / windows when holding shift or ctrl
            e.stopEvent();
            return false;
        }


        if ( (item.cls.search(/tag/) > 0) ||
             (item.cls.search(/trash/) > 0) ||
             (item.cls.search(/archive/) > 0) ) {
            if (this.loading === false) {
                if (!this.tags) { this.tags = []; }
                this.tags.push(new Ext.ux.ListPathItem(this.pathEl.child('ul'),
                                                       {text: item.text,
                                                        tagId: item.dbid,
                                                        parent: this}
                                                      ));

                this.reload();
            }
            return false;
        }

    }, this);

    if (createCMenu === true) {
        this.on('contextmenu', function(item, e) {
            this.contextItem = item;
            if ( (this.selectedItems.length <= 0) ||
                 (this.selectedItems.indexOf(item) < 0) ) {
                Ext.each(this.selectedItems, function(i) {
                    i.unselect();
                });
                this.selectedItems = [item];
                item.select();
            }

            if ((item.cls.search(/trash/) < 0) &&
                (item.cls.search(/tag/) < 0) &&
                (item.cls.search(/archive/) < 0)) {
                this.itemContext.show(item.el);
            } else if (tagging && (item.cls.search(/-tag/) >= 0)) {
                // Use -tag as a search pattern to exclude smart tags.
                this.tagContext.show(item.el);
            }
            e.stopEvent();
        }, this);
    }

    this.desktop = Ext.get(this.desktop) || Ext.get(document.body);

    // DomHelper shortcut
    var dh = Ext.DomHelper;
    this.el.clean();
    this.el.addClass(this.panelClass);


    // get body element
    if(this.bodyEl) {
        this.body = Ext.get(this.bodyEl);
        this.el.appendChild(this.body);
    }

    if (toolbarEnabled) {
//        this.toolbarEl = dh.insertFirst(this.el.dom, {tag:'div'}, true);
        this.toolbarEl = dh.append(this.el.dom, {tag:'div'}, true);
        this.toolbar = new Ext.Toolbar(this.toolbarEl);
        if( this.toolbarTitle) this.toolbar.addField(new Ext.Toolbar.TextItem(this.toolbarTitle));
        this.toolbar.el.on("click", function() {
            this.el.focus();
        }, this);
    }

    if (search) { // add filter field, if search mode is enabled

        var infoPanelEl = this.el.up("div");

        var titleDivEl = infoPanelEl.child("div.x-dock-panel-title-text");
        var titleTdEl = titleDivEl.findParent("td");
        titleDivEl.applyStyles("width: 10em");

        //Replace toolbar
        this.refreshButtonEl = dh.insertBefore(titleTdEl, {tag:"td", children:[
            {tag: "div", cls:"tarantula-button-refresh"}
        ]}, true);

        this.filterEl = dh.insertAfter(titleTdEl, {tag:'td'}, true);

        this.refreshButtonEl.on( "click", function() {
            Ext.EventObject.stopPropagation();
            this.reload();
        }, this);

        this.filterField = new Ext.form.TextField({
            width: 130});
        this.filterField.on('specialkey', function(f,e) {
            if (e.getKey() == Ext.EventObject.ENTER) {
                this.reload();
            }
        }, this);

        this.filterField.render( this.filterEl);
        //this.toolbar.addField(this.filterField);
        this.filterField.el.set({unselectable: false});

        this.filterField.getEl().on('click', function(f,e) {
                Ext.EventObject.stopPropagation();
        }, this);
    }

    // Path element which display currently selected tag

    if( this.showListPath) {
        this.pathEl = dh.append(this.el.dom,
                                {tag:'div', cls:'x-listpath',
                                 children: [{tag:'ul'}]}, true);
    }


    // List element
    this.listEl = dh.append(this.el.dom,
                            {tag:'div', cls:'x-listpanel', children:
                             [{tag:'ul', cls:'x-listpanel'}]}, true);

    // Initialize drag n' drop
    this.dragzone = new Ext.dd.DragZone(this.listEl.id,
                                        {ddGroup: this.ddGroup});
    this.dragzone.listPanel = this;
    this.dragzone.onInitDrag = function() {
        var n = this.listPanel.selectedItems.length;
        var t = {tag: 'a', children: [{tag:'span'}]};
        if (n > 1) {
            t.children[0].html = n + " selected items";
        } else {
            t.children[0].html = this.dragData.obj.text;
        }
        this.proxy.update(Ext.DomHelper.markup(t));

        if (this.listPanel.selectedItems.indexOf(this.dragData.obj) < 0) {
            Ext.each(this.listPanel.selectedItems, function(i) {
                i.unselect();
            });
            this.listPanel.selectedItems = [this.dragData.obj];
            this.dragData.obj.select();
        }
    };
    this.dropzone = new Ext.dd.DropZone(this.listEl.id,
                                        {ddGroup: this.ddGroup});
    this.dropzone.taggedList = this;


    // @param {Object} dd Source dd object.
    this.dropzone.onNodeDrop = function(target,dd,e,data) {
        if (target.obj.parent.disabled ||
            ( (target.obj.parent != data.obj.parent) &&
              (target.obj.parent.acceptDrops === false))) {
            return false;
        }

        var items = [];

        // If items are dragged from some other tree
        if (target.obj.parent.items.indexOf(data.obj) < 0) {

            var sitems = dd.listPanel.selectedItems;
            var nitems = []; // These will be the normal items
            // only. No tags etc
            // Loop dragged items for tags and create array of
            // normal items without the tags.
            for(var i=0,il=sitems.length;i<il;++i){
                if (sitems[i].cls.search(/tag/) >= 0) {
                    // Add items tagged with the tag
                    // this will fire own items added event, so altering
                    // nitems is not needed
                    this.taggedList.addTag(sitems[i], 'after', target.obj);
                } else {
                    nitems.push(sitems[i]);
                }
            }
            // Add normal items to the list and append them to
            // the items array.
            items = target.obj.parent.addItems(nitems,
                                               'after',
                                               target.obj).added;
            // Fire itemsadded element and send list of added
            // items to the listeners. (ie. setdesign form)
            target.obj.parent.fireEvent('itemsadded', items);
            return true;
        }

        // If items are dragged inside the same tree
        if (data.obj.cls.search(/tag/) < 0 ) {
            // Note: using -tag as search pattern prevents
            // dragging items to smarttags
            if (target.obj.cls.search(/-tag/) >= 0) {
                // Tag items by dragging them over tag
                Ext.each(dd.listPanel.selectedItems, function(i) {
                    var ntags;
                    if (i.tags.length <= 0) {
                        ntags = target.obj.text;
                    } else {
                        ntags = [i.tags, target.obj.text].join(',');
                    }
                    i.tag_with(ntags);
                }, this);
                return true;
            } else if (target.obj.cls.search(/trash/) >= 0) {
                // Delete items by dragging them over Deleted -tag.
                if (target.obj.parent.deleteItems) {
                    target.obj.parent.deleteItems();
                } else {
                    Ext.each(dd.listPanel.selectedItems, function(i) {
                                 i.delete_from_db();
                             });
                }
                return true;
            } else if (target.obj.cls.search(/archive/) >= 0) {
                // Archive items by dragging them over Archive -tag.
                target.obj.parent.archiveItems();
                return true;
            } else {
                // Selected items in same list are dropped over another
                // item. --> Move those items after target item.
                items = target.obj.parent.moveItems(
                    dd.listPanel.selectedItems,
                    'after', target.obj);
            }
        }
        // Allows parent form to get position changes.
        target.obj.parent.fireEvent('itemsmoved', items);
        return true;
    };

    this.dropzone.onContainerDrop = function(source, e, data) {
        // Return false if dragged from other list and this list is
        // not configured to accept external drops.
        if ( (data.obj.parent != this.taggedList) &&
             !this.taggedList.acceptDrops) {
            return false;
        }
        if (this.taggedList.disabled === false) {
            var litem = (this.taggedList.items.length > 0) ?
                this.taggedList.items[this.taggedList.items.length - 1] :
                undefined;
            var items = [];

            if (this.id != source.id)  {
                var sitems = source.listPanel.selectedItems;
                var nitems = sitems.clone(); // These will be the normal items
                                             // only. No tags etc
                // Loop dragged items for tags and create array of
                // normal items without the tags.
                for(var i=0,il=sitems.length;i<il;++i){
                    if (sitems[i].cls.search(/tag/) >= 0) {
                        // Update array of normal items
                        nitems.splice(nitems.indexOf(sitems[i]),1);
                        // Add items tagged with the tag
                        this.taggedList.addTag(sitems[i]);
                    }
                }
                // Add normal items to the list and append them to
                // the items array.
                items = this.taggedList.addItems(nitems,
                                               'after',
                                               data.obj).added;
                // Fire itemsadded element and send list of added
                // items to the listeners. (ie. setdesign form)
                this.taggedList.fireEvent('itemsadded', items);
            } else {
                items =this.taggedList.moveItems(source.listPanel.selectedItems,
                                                  'after', litem);
                this.taggedList.fireEvent('itemsmoved', items);
            }
            return true;
        }
    };

    this.dropzone.onNodeOver = function(target,dd,e,data) {
        if ( (target.obj.parent != data.obj.parent) &&
            (target.obj.parent.acceptDrops === false)) {
            return false;
        }
        if (target.obj.parent.disabled === false) {
            if ( (target.obj.cls.search(/-tag/) >= 0) ||
                 (target.obj.cls.search(/trash/) >= 0) ||
                 (target.obj.cls.search(/archive/) >= 0)) {
                return "x-dd-drop-ok-add";
            } else {
                return "x-tree-drop-ok-between";
            }
        }
    };

    this.dropzone.onContainerOver = function(source, e, data) {
        if (this.taggedList.disabled === false) {
            return "x-dd-drop-ok-add";
        }
    };

    this.listEl.on('scroll', function(e,l) {
        if (!this.url) {
            return false;
        }

      var offset;
        if ( !this.loading &&
             ((l.scrollTop + l.clientHeight) >= (l.scrollHeight - 50)) &&
             (this.items.length >= LIST_LOAD_LIMIT) ) {
            // Scrolling down
            offset = this.getNextOffset();
            this.load({nodes: this.getTagIds(), offset: offset,
                       filter: this.getFilter()},
                      'after',
                      function(n) { // n == number of items added
                          if (n > 0) {
                              this.loadedOffsets.push(offset);
                              var len = this.items.length;
                              if (len > 2*LIST_LOAD_LIMIT) {
                                  for(i=0;i<LIST_LOAD_LIMIT;++i) {
                                      // TODO: Some way to support
                                      // selecting ranges of items when
                                      // some of the items are already
                                      // deleted from the list.
                                      // Quickfix for #325
                                      var j = this.selectedItems.indexOf(
                                          this.items[i]);
                                      if (j >= 0) {
                                          this.selectedItems.splice(j,1);
                                      }
                                      this.items[i].destroy();
                                  }
                                  this.items.splice(0,LIST_LOAD_LIMIT);
                                  this.loadedOffsets.shift();
                                  len -= LIST_LOAD_LIMIT;
                                  // Moves scrollTop next to the same
                                  // it where it was before new items
                                  // were inserted.
                                  l.scrollTop += l.scrollHeight *
                                      ((LIST_LOAD_LIMIT/len) - 1);
                              }
                          }
                      });

        } else if ( !this.loading &&
                    (l.scrollTop <= 50) &&
                    ((offset = this.getPrevOffset()) >= 0) ) {
            // Scrolling up

            this.load({nodes: this.getTagIds(), offset: offset,
                       filter: this.getFilter()},
                      'before',
                      function(n) { // n == number of items added
                          if (n > 0) {
                              this.loadedOffsets.unshift(offset);
                              var len = this.items.length;
                              if (len > 2*LIST_LOAD_LIMIT) {
                                  var i, rem_start;
                                  // Determine starting point for
                                  // removing old items. This can be larger
                                  // than len-LIST_LOAD_LIMIT if last
                                  // loaded offset was smaller than
                                  // LIST_LOAD_LIMIT.
                                  for(i=(len-LIST_LOAD_LIMIT);i<len;++i) {
                                      if (this.items[i-1].offset <
                                          this.items[i].offset) {
                                          rem_start = i;
                                          break;
                                      }
                                  }
                                  // Start removal from i position determined
                                  // in previous loop.
                                  for(i=rem_start;i<len;++i) {
                                      // TODO: Some way to support
                                      // selecting ranges of items when
                                      // some of the items are already
                                      // deleted from the list.
                                      // Quickfix for #325
                                      var j = this.selectedItems.indexOf(
                                          this.items[i]);
                                      if (j >= 0) {
                                          this.selectedItems.splice(j,1);
                                      }
                                      this.items[i].destroy();
                                  }
                                  this.items = this.items.slice(0,rem_start);
                                  this.loadedOffsets.pop();
                                  len = rem_start;
                              }
                              // Normally n == LIST_LOAD_LIMIT
                              l.scrollTop += (n * l.scrollHeight) / len;
                          }
                      });
        }
    }, this);

    if (createCMenu === true) {
        // Creates context menu for normal items
        this.itemContext = new Ext.menu.Menu({});
        if (tagging) {
            this.itemContext.add(
                new Ext.menu.Item({
                    text:'Add tags',
                    icon:createUrl('/images/famfamfam/tag_blue.png'),
                    scope: this,
                    handler: function() {
                        var t;
                        if (this.selectedItems.length > 1) {
                            t = 'New tags for ' + this.selectedItems.length +
                                ' selected items:';
                        } else {
                            t = 'New tags for "' + this.selectedItems[0].text + '":';
                        }
                        var f = new Ext.testia.TagField({
                            store: new Ext.data.JsonStore({
                                url: createUrl('/projects/current/tags/?taggable_type=' + this.taggableType),
                                root: 'data',
                                id: 'dbid',
                                fields: ['dbid', 'text']
                            }),
                            mode: 'local',
                            fieldLabel: t,
                            displayField: 'text',
                            width: 230 // '94%'
                        });
                        var d = new Ext.testia.ComboDialog({
                            title: 'Add tags',
                            scope: this,
                            combo: f,
                            height: 200,
                            fn: function(b, v) {
                                if (b == 'ok') {
                                    this.tagItems(v);
                                }
                            }
                        });
                        f.store.load();
                    }
                })
            );
            this.itemContext.add(new Ext.menu.Separator());
        }

        this.itemContext.add(
            new Ext.menu.Item({
                // TODO: Change text between Delete/Undelete depending on
                // current folder.
                text:'(Un)delete item(s)',
                icon:createUrl('/images/famfamfam/bin.png'),
                scope: this,
                handler: function(c,e) {
                    if (this.deleteItems) {
                        // This is available in Ext.testia.CaseListPanel
                        this.deleteItems();
                    } else {
                        Ext.each(this.selectedItems, function(i) {
                                if ((i.cls.search(/trash/) < 0) &&
                                    (i.cls.search(/-tag/) < 0)) {
                                    i.delete_from_db();
                                }
                        });
                    }
                }
            })
        );

        if (this.archiveUrl) {
            this.itemContext.add(
                new Ext.menu.Item({
                    // TODO: Change text between Delete/Undelete depending on
                    // current folder.
                    text:'(Un)archive item(s)',
                    icon:createUrl('/images/famfamfam/compress.png'),
                    scope: this,
                    handler: function(c,e) {
                        this.archiveItems();
                    }
                })
            );
        }

        if (tagging) {
            // Create context menu for tag items
            this.tagContext = new Ext.menu.Menu({});
            this.tagContext.add(
                new Ext.menu.Item({
                    text:'Rename tag',
                    //icon:createUrl('/images/famfamfam/tag_blue.png'),
                    scope: this,
                    handler: function() {
                        if (Ext.isEmpty(this.tagUrl)) {return;}
                        // TODO: Kentälle default arvo
                        Ext.Msg.prompt('Rename tag', 'New name:',
                                       function(btn,text){
                                           if (btn == 'ok') {
                                               Ext.Ajax.request({
                                                   url: this.tagUrl.replace('%i',
                                                                            this.contextItem.dbid),
                                                   method: 'put',
                                                   params: {name: text},
                                                   scope: this,
                                                   success: function() {this.reload();}
                                               });
                                           }
                                       }, this);
                    }
                })
            );
            this.tagContext.add(new Ext.menu.Separator());
            this.tagContext.add(
                new Ext.menu.Item({
                    // TODO: Change text between Delete/Undelete depending on
                    // current folder.
                    text:'Delete tag',
                    icon:createUrl('/images/famfamfam/bin.png'),
                    scope: this,
                    handler: function() {
                        Ext.MessageBox.confirm("Confirm deletion", "Really delete tag?",
                                               function(b) {
                                                   if (b == "yes") {
                                                       Ext.Ajax.request({
                                                           url: this.tagUrl.replace('%i',
                                                                                    this.contextItem.dbid),
                                                           method: 'delete',
                                                           scope: this,
                                                           success: function() {this.reload();}
                                                       });
                                                   }
                                               }, this);
                    }
                })
            );
        }
    }

    if (Ext.isIE) {
        this.el.dom.onselectstart = function() {return false;};
    }

    this.items = [];
    if (initial_load !== false) {
        this.reload();
    }
};

// extend
Ext.extend(Ext.ux.ListPanel, Ext.ContentPanel, {
    deletedFolder: undefined,
    toolbarEl: undefined,
    toolbarTitle: undefined,
    listEl: undefined,
    acceptDrops: undefined,
    dragzone: undefined,
    dropzone: undefined,
    ddGroup: undefined,
    pathEl: undefined,
    filterField: undefined,
    url: undefined,
    itemUrl: undefined, // rest style base url to be used with normal items
    tagUrl: undefined, // rest style base url for tags
    archiveUrl: undefined,
    items: undefined, /* should be [], but that will make attribute
    * static for some reason.
    * See: http://ajaxblog.com/archives/2005/06/02/javascript-static-variables
    */
    selectedItems: undefined, // []
    tags: undefined, // []
    loadedOffsets: undefined, // []
    loading: false,
    itemContext: undefined,
    tagContext: undefined,
    contextItem: undefined, // item for which context menu was opened, may be
    // different than latest selected item.
    disabled: false,
    toggleSelection: false,
    showListPath: true,


    archiveItems: function() {
        var ids = this.selectedItems.map(function(i) {return i.dbid;}).join(',');
        Ext.Ajax.request({
            url: this.archiveUrl,
            method: ((this.tags.filter(function(i) {
                return (i.tagId === 'archived');
            })).length === 0) ? 'post' : 'delete',
            params: {ids: ids},
            scope: this,
            success: function() {
                this.reload();
            }
        });
    },

    disable: function() {
        this.disabled = true;
        if (this.filterField) {
            this.filterField.disable();
        }
    },

    enable: function() {
        this.disabled = false;
        if (this.filterField) {
            this.filterField.enable();
        }
    },

    reset: function() {
        this.selectedItems = [];
        if (this.items !== undefined) {
            Ext.each(this.items, function(i){
                i.destroy();
            });
        }
        this.items = [];

        if (this.tags !== undefined) {
            Ext.each(this.tags, function(i) {
                i.el.remove();
            });
        }
        this.tags = [];

        this.loadedOffsets = [];

        if (this.filterField) {
            this.filterField.reset();
        }
    },

    getTagIds: function() {
        var ids = [];
        if (this.tags === undefined) {this.tags = [];}
        Ext.each(this.tags, function(i) {
            ids.push(i.tagId);
        });
        return ids.join(',');
    },

    getFilter: function() {
        if (this.filterField) {
            return this.filterField.getValue();
        } else {
            return "";
        }
    },

    unselectTag: function(t) {
        var i = this.tags.indexOf(t);
        this.tags.splice(i,1);
        t = undefined;
        this.reload();
    },

    reload: function() {

        if (this.loading === true) {
             return;
        }
        this.loading = true;

        if (this.items !== undefined) {
            Ext.each(this.items, function(i){
                i.destroy();
            });
        }
        this.items = [];

        var t = this.selectedItems.last();
        this.load({nodes: this.getTagIds(),
                   filter: this.getFilter(),
                   offset: (t) ? t.offset : 0},
                  undefined,
                  function(len, scroll_to) {
                      this.loadedOffsets =
                          [(t) ? t.offset : 0];
                      if (scroll_to && scroll_to.el) {
                          this.listEl.dom.scrollTop =
                              this.listEl.dom.scrollHeight -
                              this.listEl.dom.clientHeight;
                          scroll_to.el.scrollIntoView(this.listEl,false);
                          this.selectedItems = [scroll_to];
                          scroll_to.select();
                      } else {
                          this.selectedItems = [];
                      }
                  });
    },

    /* p = parameters for request (filter, tags, etc)
     * pos = position for new items
     *         (before, after, undefined == complete reload)
     * cb = callback function after succesfull load & add operation
     */
    load: function(p, pos, cb) {
        var ret = {added: [], scrollTo: undefined};

        if (!p.limit) {
            if ( this.deletedFolder && (p.offset === 0) &&
                 (this.tags.length === 0) ) {
                if (this.deletedFolder && this.archiveUrl) {
                    p.limit = LIST_LOAD_LIMIT - 2; // let room for deleted and archive folder
                } else if (this.deletedFolder || this.archiveUrl) {
                    p.limit = LIST_LOAD_LIMIT - 1; // let room for deleted or archive folder
                }
            } else {
                p.limit = LIST_LOAD_LIMIT;
            }
        }
        var u = this.getUrl(p);
        if (u === '') {
            return false;
        }

        //this.loading = true;

        Ext.Ajax.request({
            url: u,
            method: 'get',
            scope: this,
            callback: function(o, s, r) {
                var data = [];

                if (s === true) {
                    data = Ext.decode(r.responseText) || [];
                    if ( (p.offset === 0) && (this.tags.length === 0)) {
                        if ( this.archiveUrl ) {
                            data.unshift({dbid: 'archived', text: 'Archive', leaf: true,
                                          cls: 'x-listpanel-archive folder'});
                        }
                        if ( this.deletedFolder ) {
                            data.unshift({dbid: 'deleted', text: 'Deleted', leaf: true,
                                          cls: 'x-listpanel-trash folder'});
                        }
                    }
                    if (data.length > 0) {
                        ret = this.addItems(data, pos, undefined,
                                            p.offset);
                    }

                    if (cb !== undefined) {
                        // Call load callback with parameters:
                        //      length integer length of loaded items
                        //      scroll_to object Focus scroll position to this item
                        //      added_items array items added to the list
                        cb.call(this, data.length, ret.scrollTo, ret.added);
                    }
                }
                this.loading = false;
            }
        });
    },

    // Add's items tagged with selected tag to the list
    addTag: function(tag, pos, target) {
        // TODO: Should search box status be ignored like it's ignored now
        var added = [];
        pos = pos || 'after';

        Ext.Ajax.request({
            url: tag.parent.getUrl({nodes: tag.dbid}),
            method: 'get',
            scope: this,
            success: function(r,o) {
                var data = Ext.decode(r.responseText);
                if (data.length > 0) {
                    // Exclude tags, which are in the beginning of
                    // the list
                    var tc;
                    for(tc=0,tl=data.length;tc<tl;++tc) {
                        if ( (data[tc].cls.search(/tag/) < 0) &&
                             (data[tc].cls.search(/trash/) < 0)) {
                            break;
                        }
                    }
                    data.splice(0,tc);
                    added = this.addItems(data, pos, target, 0).added;
                }
                this.fireEvent('itemsadded', added);
            }
        });
    },

    // Returns array containing added items.
    // @param {Array} nitems Array of new items
    // @pos {String} before or after
    // @item {Ext.testia.ListItem} Target item
    addItems: function(nitems, pos, item, loffset) {
        var created_items = [];
        var scroll_to = this.selectedItems.last() || null;
        var st_found = false;

        // Remove duplicate items from array
        var cmp = function(a,b) {
            if (a.dbid == b.dbid) {
                    return true;
            }
            return false;
        };
        var items = nitems.uniq(cmp);

        if (item && (this.items.indexOf(item) < 0)) {
            item = undefined;
        }

        if (pos == 'before') {
            items = items.reverse();
        }

        var prev = item;
        Ext.each(items,function(i,c) {
            var o = Ext.apply({},{
                cls: i.cls + (((c % 2) === 0) ? ' even' : ' odd'),
                parent: this,
                offset: loffset || 0
            },i);
            if (prev && prev.position) {
                o.position = prev.position + 1;
            } else if (!item) {
                o.position = 1;
            }

            var ni = new Ext.ux.ListItem(this.listEl.child('ul'), o, pos,prev);
            prev = ni;
            ni.diff = ni.position; // difference in position change user at
                                // server side.
            if (!st_found && scroll_to && (ni.dbid == scroll_to.dbid)) {
                scroll_to = ni;
                st_found = true;
            }
            created_items.push(ni);
        }, this);

        var nindex = this.getNewIndex(pos,item);
        this.items = [].concat(this.items.slice(0,nindex),
                               created_items,
                               this.items.slice(nindex, this.items.length));
        if (st_found) {
            return {added: created_items, scrollTo: scroll_to};
        } else {
            return {added: created_items};
        }
    },

    // Moves items before or after item, returns array of successfully moved
    // items
    moveItems: function(mitems, pos, item) {
        if (mitems.indexOf(item) >= 0) {
            return [];
        }
        var prev = item;
        var dh = Ext.DomHelper;
        // Temporarily remove references to moved items from the list
        var o = this.items[0].position; // for updating the order fields after
                                    // insert
        Ext.each(mitems, function(i) {
            this.items.splice(this.items.indexOf(i),1);
            // Use the same loop to update DOM view
            //i.el.remove();
            if ((pos == 'after') || (prev !== item)){
                i.el.insertAfter(prev.el);
            } else {
                i.el.insertBefore(prev.el);
            }
            prev = i;
        }, this);

        // Insert moved items after/before the target
        var nindex = this.getNewIndex(pos,item);
        this.items = [].concat(this.items.slice(0,nindex),
                               mitems,
                               this.items.slice(nindex, this.items.length));
        // Update order fields for all items
        for(var i=0, il=this.items.length; i<il; ++i) {
            this.items[i].diff = o + i - this.items[i].position;
            if (this.items[i].diff > 0) {
                this.items[i].diff += mitems.length - 1;
            }
            this.items[i].position = o + i;
        }

        return mitems;
    },

    /** Tags all selected items.
     *  @param {String} tags Comma separated string of tags to be applied
     */
    tagItems: function(tags) {
        // 1. käy lapi itemit ja nappaa
        // id:t
        // 2. Lähetä POST /tags
        // parametrit: type = cases
        //            items = id array
        //            tags = tag string
        var params = {
            type: this.url.match(/\/([^\/]*)\/?$/)[1],
            tags: tags,
            items: []
        };
        Ext.each(this.selectedItems, function(i){
            params.items.push(i.dbid);
        });

        Ext.Ajax.request({
            url: createUrl('/projects/current/tags'),
            method: 'post',
            params: Ext.urlEncode({data: Ext.encode(params)}),
            scope: this,
            success: function() {this.reload();}
        });
    },

    // Removes selected items from the list, and returns array of removed
    // items.
    removeSelected: function() {
        var removed = this.selectedItems.clone();

        var o = this.items[0].position;

        Ext.each(removed, function(i) {
            var j = this.items.indexOf(i);
            if (j >= 0) {
                i.el.remove();
                this.items.splice(j,1);
            }
            this.selectedItems.splice(this.selectedItems.indexOf(i),1);
        }, this);

        // Update order fields for all items
        for(var i=0, il=this.items.length; i<il; ++i) {
            this.items[i].position = o + i;
        }
        return removed;
    },

    // Return listindex for move/insert/add operation, which is
    // relative to the current view in the list. (!= item.order)
    getNewIndex: function(pos, item) {
        // Määritellään listasta index johon uudet solut tulevat.
        // Uusi lista muodostuu yhdistämällä:
        // 0..nindex, uudet solut, nindex..loppu
        // pos ollessa after nindex == item index + 1, jolloin sekin
        // otetaan mukaan 0..nindex siivuun.
        var nindex;
        if (item) {
            nindex = this.items.indexOf(item);
            if (pos == 'after') {nindex++;}
        } else if (pos == 'before') {
            nindex = 0;
        } else if (pos == 'after') {
            nindex = this.items.length;
        }
        return nindex;
    },

    getPrevOffset: function() {
        if (this.loadedOffsets) {
            return Math.min.apply( Math, this.loadedOffsets ) - 1;
        } else {
            return -1;
        }
    },

    getNextOffset: function() {
        return Math.max.apply( Math, this.loadedOffsets ) + 1;
    },

    hilightItems: function(ids) {
        if (ids) {
            Ext.each(ids, function(i) {

            });
        }
    },

    dimItems: function(ids) {
    },

    getUrl: function(params) {
        u = this.url || '';
        if (params && params.nodes && u.match('%t')) {
            u = u.replace(/%t/,params.nodes);
            delete(params.nodes);
        } else {
            u = u.replace(/\/?%t/,'');
        }

        p = (params) ? '?' + Ext.urlEncode(params) : '';
        return u + p;
    }

}); // end of extend

