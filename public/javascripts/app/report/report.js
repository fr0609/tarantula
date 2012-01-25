
var ReportRequests = function() {
    return {
        reqs: [],
        reports: {},

        start: function(id) {
            this.reqs.push(id);
        },

        end: function(id) {
            this.reqs.splice(this.reqs.indexOf(id),1);
            if (this.reqs.length == 0) {
                this.isReady.defer(1000, this);
            }
        },

        isReady: function() {
            if (this.reqs.length == 0) {
                this.onReady();
            }
        },

        onReady: function() {
        },

        addReport: function(id, rep) {
            this.reports[id] = rep;
        },

        ofc_data: function(id) {
            if (this.reports[id]) {
                return this.reports[id].ofc_data(id);
            }
            return null;
        }
    };
}();

// Generic object for handling reports.
var Report = function(data) {
    this.data = [];
    this.charts = {};
    this.ignore_fields = /((^|_)(id|by|version|deleted|links))$/;
    this.elements = {};
    this.groups = [];
    this.setData(data);
};

Report.prototype.setData = function(data) {
    if (typeof data == 'string') {
        this.data = Ext.decode(data);
    } else if (data instanceof Array) {
        this.data = data;
    }
    Ext.each(this.data, function(group) {
        Ext.each(group.components, function(i) {
            if (i.type == 'meta') {
                if (i.pdf_export_url) {
                    this.pdf_export_url = i.pdf_export_url;
                }
                if (i.data_post_url) {
                    this.data_post_url = i.data_post_url;
                }
                if (i.spreadsheet_export_url) {
                    this.spreadsheet_export_url = i.spreadsheet_export_url;
                }
            }
        }, this);
    }, this);
};

Report.prototype.render = function(el) {
    var m;
    Ext.each(this.data, function(group, g) {
        if ( (group.type === 'report') &&
            (group.components.filter(function(i) {return (i.type !== 'meta');}).length > 0)) {
            var rEl = this.groups[g] || Ext.DomHelper.append(el, {tag:'div', cls:'report-group '+ ( (g%2 == 0) ? 'even' : 'odd')}, true);
            if (!this.groups[g]) {
                this.groups[g] = rEl;
            }
            Ext.each(group.components, function(element, c) {
                if ( (m = element.type.match(/text_(.+)/)) ) {
                    if (!this.elements['g'+g+'c'+c]) {
                        if (element.editable) {
                            this.elements['g'+g+'c'+c] = Ext.DomHelper.append(rEl, {
                                tag:'div',
                                cls:'report-item report-item'+c
                            }, true);
                            var f = new Ext.form.TextArea({
                                value: element.value
                            });
                            f.render(this.elements['g'+g+'c'+c]);
                            element.field = f;
                        } else {
                            this.elements['g'+g+'c'+c] = Ext.DomHelper.append(rEl, {
                                tag:m[1],
                                cls:'report-item report-item'+c,
                                //cls:'x-layout-panel-hd',
                                html:element.value
                            }, true);
                        }
                    }
                } else if ( element.type === 'parameters' ) {
                    m = [];
                    for (var i in element.value) {
                        m.push(i + ": <b>" + element.value[i] + "</b>");
                    }
                    if (!this.elements['g'+g+'c'+c]) {

                        this.elements['g'+g+'c'+c] = Ext.DomHelper.append(rEl, {
                            tag: 'p',
                            cls: 'report-item report-item-parameters report-item'+c,
                            html: m.join(';')
                        }, true);
                    } else {
                        this.elements['g'+g+'c'+c].dom.innerHTML = m.join(';');
                    }
                } else if ( (element.type === 'table') ||
                    (element.type === 'table_collapsable') ) {
                    if (!this.elements['g'+g+'c'+c]) {
                        this.elements['g'+g+'c'+c] = Ext.DomHelper.append(rEl, {
                            tag:'div',
                            cls:'tbl report-item report-item'+c
                        }, true);
                    }
                    this.renderTable(this.elements['g'+g+'c'+c], element.columns,
                        element.data, (element.type === 'table_collapsable'));
                    if (element.csv_export_url) {
                        var lel = this.elements['g'+g+'c'+c].child('p') ||
                            Ext.DomHelper.append(this.elements['g'+g+'c'+c],
                            {tag:'p', cls:'emulate-link', html:'Export table to CSV'}, true);
                        // Kludge to fix unnecessary beforeunload event when clicking
                        // csv export links.
                        lel.on('click', function() {
                            var dEl = Ext.get('downloadIframe') || Ext.DomHelper.append(
                                document.body, {tag:'iframe', id:'downloadIframe',
                                style:'display:none'}, true);
                            dEl.set({src:element.csv_export_url});
                        }, lel);
                    }
                } else if (element.type == 'chart') {
                    if (!this.elements['g'+g+'c'+c]) {
                        this.elements['g'+g+'c'+c] = Ext.DomHelper.append(rEl, {
                            tag:'div',
                            cls:'report-item report-item'+c
                        }, true);
                    }
                    this.renderChart(this.elements['g'+g+'c'+c], element);
                } else if (element.type == 'table_overview') {
                    if (!this.elements['g'+g+'c'+c]) {
                        this.elements['g'+g+'c'+c] = Ext.DomHelper.append(rEl, {
                            tag:'div',
                            cls:'dashboard-overview report-item report-item'+c
                        }, true);
                    }
                    this.renderOverview(this.elements['g'+g+'c'+c], element.columns,
                        element.data);
                }
            }, this);
        }
    }, this);
};

Report.prototype.exportSpreadsheet = function() {
    if (Ext.isEmpty(this.spreadsheet_export_url)) {
        Ext.Msg.alert("Export error", "Spreadsheet export url is missing. Can't export.");
        return;
    }

    var dEl = Ext.get('downloadIframe') || Ext.DomHelper.append(
        document.body, {tag:'iframe', id:'downloadIframe',
                        style:'display:none'}, true);

    dEl.set({src:createUrl(this.spreadsheet_export_url)});
};

Report.prototype.exportPDF = function() {
    if (Ext.isEmpty(this.pdf_export_url) || Ext.isEmpty(this.data_post_url)) {
        Ext.Msg.alert("Export error", "PDF export url, or report data post url is missing. Can't export.");
        return;
    }

    var tmpSWF;
    var f = function() {
        var dEl = Ext.get('downloadIframe') || Ext.DomHelper.append(
            document.body, {tag:'iframe', id:'downloadIframe',
                style:'display:none'}, true);

        dEl.set({src:createUrl(this.pdf_export_url)});

    };

    ReportRequests.reqs = [];
    ReportRequests.onReady = f.createDelegate(this);

    // Upload textual report data
    var params = {};
    var params_count = 0;
    Ext.each(this.data, function(group) {
        Ext.each(group.components, function(i) {
            if (i.editable && i.field.getValue) {
                params[i.key] = i.field.getValue();
                params_count++;
            }
        }, this);
    }, this);
    if (params_count > 0) {
        ReportRequests.start("data1");
        Ext.Ajax.request({
                             url: this.data_post_url,
                             method: 'post',
                             params: params,
                             scope: this,
                             success: function() {
                                 ReportRequests.end("data1");
                             }
                         });
    }
    // Upload chart images
    var charts_count = 0;
    for (var c in this.charts) {
        if (this.charts[c].image_post_url) {
            charts_count++;
            ReportRequests.start(c);
            tmpSWF = swfobject.getObjectById(c);
            if (tmpSWF !== null) {
                Ext.fly(tmpSWF).scrollIntoView(GUI.layout.getRegion('center').bodyEl);
            }
            var url = this.charts[c].image_post_url;
            if (!url.match(/^http/)) {
                url = window.location.href.match(
                        /^(https?:\/\/[^\/]+)/)[1] +
                    url;
            }
            var g = function(chart) {
                try {
                    tmpSWF.post_image(url,
                                      'ReportRequests.end("'+chart+'")',
                                      false);
                } catch(e) {
                    if (!tmpSWF || !tmpSWF.post_image) {
                        g.defer(1000, this, [chart]);
                    } else {
                        alert(e);
                    }
                }
            };
            g(c);
        }
    }
    GUI.layout.getRegion('center').bodyEl.scrollTo('top', 0, false);
    // Force pdf download, if no requests has been sent
    if (params_count + charts_count == 0) {
        f.call(this);
    }
};

/** @param {Element} el Target element
 *  @param {Object} o Object to be rendered
 *  @param {Array} fields Array of keys to be rendered in rendering order
 *  @param {Function} fn Function which generates html for key / value combo
 *  @param {Ext.UpdateManager} um Associated Ext.UpdateManager
 */
Report.prototype.renderObject = function(el, o, fields, fn, um) {
    Ext.each(fields, function(i) {
        if ( (i.match && !(i.match(this.ignore_fields))) &&
             (typeof o[i] != 'function') ) {
            var value = null;
            if (typeof o[i] == "object") {
                value = o[i].name;
            } else if (i.match(/duration/) && (typeof o[i] === "number")) {
                value = o[i].toDurationString();
            } else if (o[i].match && o[i].match(/%$/)) {
                value = [{tag:'div', cls:'total', children:[
                    {tag:'div', cls:'progress',
                     style:'width:'+o[i]+';', html:o[i]
                    }]
                         }];
            } else {
                value = o[i];
            }
            if (value !== null) {
                var fEl = Ext.DomHelper.append(el, fn(i, value), true);
                var link = fields.links[i];
                if (link) {
                    if (link.target.match(/http:\/\//)) {
                        fEl.dom.innerHTML = "<a href='" + link.target +
                            "' target='_blank'>" + fEl.dom.innerHTML + "</a>";
                    } else {
                        fEl.on('click', function() {
                            this.fireEvent('resourceobjectselected',
                            link.target, link.id);
                        }, GUI);
                    }
                }
                // if (um.defaultUrl.match(/execution/)) {
                //     fEl.on('click', function() {
                //         this.fireEvent('resourceobjectselected',
                //                        'execute', o.id);
                //     }, GUI);
                // } else if (um.defaultUrl.match(/project/)) {
                //     fEl.on('click', function() {
                //         this.projectCombo.setValue(o.id);
                //         this.loadProject(o.id);
                //     }, GUI);
                // }
            }
        }
    }, this);
};

/**
 * @param {Element}
 * @param {Array} a Array to be rendered
 * @param {Ext.Updatemanager} um
 */
Report.prototype.renderArray = function(el, a, fields, um) {
    if (!(a instanceof Array)) {
        return;
    }
    var dh = Ext.DomHelper; // shortcut
    var tags = {tag:'table', children: [{tag:'tbody', children:
                                         [{tag:'tr', children: []}]}]};
    // Assume that array contains multiple instances of
    // of single type object and render table headers
    // from the field labels of the first object.
    Ext.each(fields, function(i) {
        if (typeof i == 'string') {
            tags.children[0].children[0].children.push(
                {tag:'th', html:i.humanize()});
        }
    }, this);
    var tagsEl = dh.append(el, tags, true).child('tbody');
    // Loop through array items, render individual objects using
    // table row format function with renderObject function.
    Ext.each(a, function(i) {
        var rowEl = dh.append(tagsEl, {tag:'tr', children:[]}, true);
        renderObject(rowEl, i, fields, function(key,val,link) {
            if (val instanceof Array) {
                return {tag:'td', children: val};
            } else if (link) {
                return {tag:'td', children: [
                    {tag:'a', href:'#', html:val.toString()}
                ]};
            }
            return {tag:'td', html:val.toString()};
        }, um);

    }, this);
};

Report.prototype.renderOverview = function(el, fields, data) {
    el.clearContent();

    if (data && fields) {
        Ext.each(fields, function(i) {
            if ( (typeof data[0][i[0]] == 'string') ||
                 (typeof data[0][i[0]] == 'number')) {
                Ext.DomHelper.append(el, {
                    tag: 'div', cls:'overview_block', children: [
                        {tag:'p', children: [
                            {tag:'small', html:i[1]}
                        ]},
                        {tag:'p', html: data[0][i[0]]}
                    ]
                });
            }
        });
    }
};

Report.prototype.renderTable = function(el, columns, data, collapse) {
    el = el.child('table tbody') ||
        Ext.DomHelper.append(el, {
            tag:'table', children: [{tag:'tbody'}]}, true).child('tbody');
    el.clearContent();

    var keys = [];
    var tags = {};

    if (columns !== undefined) {
        tags = {tag:'tr', children:[]};
        Ext.each(columns, function(i) {
            tags.children.push({tag:'th', html:i[1]});
            keys.push(i[0]);
        });

        Ext.DomHelper.append(el, tags);
    }
    if (data !== undefined) {
        Ext.each(data, function(i) {
            tags = {tag:'tr', children:[]};
            Ext.each(keys, function(j) {
                var t, m;
                if ((j === 'result') || (j === 'rp_cov')) {
                    t = {tag:'td', children: [
                        {tag:'img', src:'', alt:''}
                    ]};
                    if (i[j] && i[j].match) {
                        m = i[j].match(/^([^ ]+)( \[(.)\])?/);
                    } else {
                        m = [];
                    }
                    if (m[1] === 'PASSED') {
                        t.children[0].src = IMG_PASSED;
                        t.children[0].alt = 'Passed';
                    } else if (m[1] === 'FAILED') {
                        t.children[0].src = IMG_FAILED;
                        t.children[0].alt = 'Failed';
                    } else if (m[1] === 'SKIPPED') {
                        t.children[0].src = IMG_SKIPPED;
                        t.children[0].alt = 'Skipped';
                    } else if (m[1] === 'NOT_IMPLEMENTED') {
                        t.children[0].src = IMG_NOT_IMPLEMENTED;
                        t.children[0].alt = 'Not implemented';
                    } else {
                        t = {tag:'td', html:i[j]};
                    }
                    if (m[3] === 'H') {
                        tags.cls = 'priority_1';
                    } else if (m[3] === 'L') {
                        tags.cls = 'priority_-1';
                    }
                }
                if (i.links && i.links[j]) {
                    if (t) {
                        t = {tag:'td', children: [
                                 {tag:'a', href:'#', children:t.children, cls:j}]};
                    } else {
                        t = {tag:'td', children: [
                                 {tag:'a', href:'#', html:i[j], cls:j}]};
                    }
                    if (i.links[j].target.match(/^http:\/\//)) {
                        t.children[0].href = i.links[j].target;
                        t.children[0].target = '_blank';
                    }
                /*} else if ( ((typeof i[j] == 'number') ||
                            (typeof i[j] == 'string')) && (j.search(/time|date/) >= 0) ) {
                    var d = Date.parseDate(i[j], Date.patterns.ISO8601Long);
                    t = {tag:'td', html:d.format(Date.patterns.ISO8601Long)};*/
                } else if ( (typeof i[j] == 'number') ||
                            (typeof i[j] == 'string') ) {
                    t = {tag:'td', html:i[j]};
                } else {
                    t = {tag:'td', html:''};
                }
                tags.children.push(t);
            });
            var rEl = Ext.DomHelper.append(el, tags, true);
            var lEl = rEl.child('a');
            if (lEl && lEl.dom.href.match(/#$/)) {
                lEl.on('click', function() {
                    if (i.project_id &&
                        (this.projectCombo.getValue() != i.project_id)) {
                        var w = new Ext.testia.RequestWatcher();
                        w.on('complete', function() {
                            this.fireEvent('resourceobjectselected',
                                           i.links[lEl.dom.className].target,
                                           i.links[lEl.dom.className].id);
                        }, this);
                        this.on('projectchanged', function() {
                            GUI.projectCombo.setValue(i.project_id);
                            w.stop.defer(300, w);
                        }, this, {single: true});
                        this.loadProject(i.project_id);
                    } else {
                        this.fireEvent('resourceobjectselected',
                                       i.links[lEl.dom.className].target,
                                       i.links[lEl.dom.className].id);
                    }
                }, GUI);
            }
        });
    }
    if (collapse) {
        this.addCollapseEvents(el);
    }
};

Report.prototype.addCollapseEvents = function(tableEl) {
    var rows = Ext.DomQuery.select("tr", tableEl.dom);
    var titles = {};
    var latest;

    var toggleCollapsed = function() {
        Ext.each(this.collapseTargets, function(i) {
            if (i.isVisible()) {
                i.hide();
            } else {
                i.show();
            }
        });
    };

    Ext.each(rows, function(r) {
        var tds = Ext.DomQuery.select("td", r);
        var el;
        if (tds && tds[0]) {
            if (!Ext.isEmpty(tds[0].innerHTML)) {
                latest = Ext.get(tds[0]);
                latest.addClass("emulate-link");
                Ext.fly(r).addClass("collapsable");
                latest.collapseTargets = [];
                latest.on("click", toggleCollapsed, latest);
                if (Ext.isEmpty(tds[1].innerHTML)) {
                    Ext.fly(tds[1]).remove();
                    latest.set({colSpan: 2});
                }
            } else if (latest) {
                el = Ext.get(r);
                latest.collapseTargets.push(el);
                el.setVisibilityMode(Ext.Element.DISPLAY);
                el.hide();
            }
        }
    });
};

Report.prototype.renderChart = function(el, chart) {
    var data;
    var cEl = el.child('.chart') || el.child('object');
    var wrapEl;
    el.addClass("chart");
    if (!cEl) {
        wrapEl = Ext.DomHelper.append(el, {tag:'div'}, true);
        cEl = Ext.DomHelper.append(wrapEl, {
            tag:'div', cls:'chart', children: [
                {tag:'p',
                 html:"You need to <b style='color:red;'>" +
                 "upgrade/install Flash plugin</b>" +
                 " to be able to view all content here."}
            ]
        }, true);
    }

    if (typeof chart == 'string') {
        data = Ext.decode(chart);
    } else {
        data = chart;
    }
    Ext.each(data.elements, function(i) {
        if (i.colour === null) {
            i.colour = "#FF00FF";
        }
    });
    this.charts[cEl.id] = data;
    ReportRequests.addReport(cEl.id, this);
    var tmpSWF = swfobject.getObjectById(cEl.id);

    if (!tmpSWF || (tmpSWF.tagName !== 'OBJECT')) {
        // Calculate scaled width to fit all labels depending their rotated
        // length if cookies don't provide resize information.
        var cp = GUI.chartCookies;
        var w = cp.get(this.charts[cEl.id].key + "/width");
        var h = cp.get(this.charts[cEl.id].key + "/height");
        if ( !(w && h) ) {
            var maxl = 0;
            var char_w = 10;
            Ext.each(data.x_axis.labels.labels, function(i,c) {
                         if (i.length > maxl) {
                             maxl = i.length;
                         }
                     },this);
            if (data.x_axis.labels.rotate == 'diagonal') {
                char_w = 5;
            } else if (data.x_axis.labels.rotate == 'vertical') {
                char_w = 30;
                maxl = 1;
            }
            var lw = data.x_axis.labels.labels.length * maxl * char_w;
            // Calculate width needed by bar values.
            var bar_charts = data.elements.filter(function(v) {return (v.type === "bar");});
            var bw = 0;
            bar_charts.map(function(v) {bw += v.values.length * 12;});
            // use label or bar width whichever is bigger.
            w = (lw > bw) ? lw : bw;
            if (w < 300) {
                w = 300;
            } else if (w > 1200) {
                w = '100%';
            }
            h = 300;
        }
        tmpSWF = swfobject.embedSWF(
            createUrl('/swf/ofc2ichor.swf'), cEl.id,
            "100%","100%","9.0.0", createUrl('/swf/expressinstall.swf'),
            {"data-file":"", "id":cEl.id}, {wmode:'transparent'});
        var res = new Ext.Resizable(wrapEl, {height: h, width: w});
        res.corner.el.setSize(6,6);
        res.on('resize', function(rs, w, h) {
                   // Save resizedata to cookie.
                   GUI.chartCookies.set(chart.key + "/width", w);
                   GUI.chartCookies.set(chart.key + "/height", h);
               });
    } else {
        try {
            tmpSWF.load(Ext.encode(this.charts[cEl.id]));
        } catch (x) {
            // Catches flash error with Windows Firefox.
        }
    }
};

Report.prototype.ofc_data = function(id) {
    return Ext.encode(this.charts[id]);
};