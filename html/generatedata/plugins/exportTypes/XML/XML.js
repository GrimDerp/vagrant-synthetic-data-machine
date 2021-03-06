/*global $:false,CodeMirror:false*/
define([
	"manager",
	"generator",
	"constants",
	"lang"
], function(manager, generator, C, L) {

	"use strict";

	/**
	 * @name XML
	 * @see ExportType
	 * @description Client-side code for the XML Export Type.
	 * @namespace
	 */

	var MODULE_ID = "export-type-XML";
	var LANG = L.exportTypePlugins.XML;
	var _codeMirror = null;

	// sucks to include this in the JS, but the <? .. ?> of the XML tag gets screwed up when embedding
	// this in a hidden HTML element
	var _defaultCustomXML = "{if $isFirstBatch}\n<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n" +
		"<records>\n" +
		"{/if}\n" +
		"{foreach $rowData as $row}\n" +
		"\t<record>\n" +
		"{foreach from=$colData item=col name=c}\n" +
		"\t\t<{$col}>{$row[$smarty.foreach.c.index]}</{$col}>\n" +
		"{/foreach}\n" +
		"\t</record>\n" +
		"{/foreach}\n" +
		"{if $isLastBatch}\n" +
		"</records>\n" +
		"{/if}";


	var _init = function() {
		var subscriptions = {};
		subscriptions[C.EVENT.RESULT_TYPE.CHANGE] = _resultTypeChanged;
		manager.subscribe(MODULE_ID, subscriptions);

		$(window).resize(_updateDialogDimensions);
		$("#etXMLEditCustomFormat").bind("click", function() { _openEditCustomFormatDialog(); return false; });

		// assign event handlers for the custom sections option
		$("#etXMLUseCustomExportFormat").bind("click", function() {
			if (this.checked) {
				$("#etXMLEditCustomFormat").removeAttr("disabled");
				$("#etXMLRootNodeName,#etXMLRecordNodeName").attr("disabled", "disabled");
				$(".etXMLDefaultFormatLabels").addClass("gdDisabledText");
			} else {
				$("#etXMLEditCustomFormat").attr("disabled", "disabled");
				$("#etXMLRootNodeName,#etXMLRecordNodeName").removeAttr("disabled");
				$(".etXMLDefaultFormatLabels").removeClass("gdDisabledText");
			}
		});

		// for onload
		if ($("#etXML_useCustomExportFormat").attr("checked")) {
			$("#etXML_customFormat").removeAttr("disabled").removeClass("gdDisabled");
		}

		// initialize the CodeMirror field
		_codeMirror = CodeMirror.fromTextArea($("#etXMLCustomSmarty")[0], {
			mode: "xml",
			lineNumbers: true
		});
		$("#etXMLCustomContent .CodeMirror").addClass("CodeMirror_medium");

		// initialize CodeMirror to contain the default content
		_codeMirror.setValue(_defaultCustomXML);

		$("#etXML_ResetCustomHTML").on("click", _resetCustomHTML);
	};


	var _validate = function(rowNums) {
		var errors = [];

		var invalidNodeNames  = [];

		for (var i=0; i<rowNums.length; i++) {
			var rowNum = rowNums[i];
			var nodeField = $("#gdTitle_" + rowNum);
			var nodeFieldVal = nodeField.val();

			// if ($("#title_" + nodeNum).val().match(/\W/) ||  $("#title_" + nodeNum).val().match(/^[^a-zA-Z]/)) {
			// invalidNodeNames.push([$("#title_" + nodeNum), visibleRowNum]);
			// }
		}

/*		if (invalidNodeNames.length) {
			var problemFields = [];
			var rowNumbers    = [];
			for (var i=0; i<invalidNodeNames.length; i++) {
				problemFields.push(invalidNodeNames[i][0]);
				rowNumbers.push(invalidNodeNames[i][1]);
			}
			utils.addValidationErrors({ els: problemFields, error: L.missing_node_names + " <b>" + rowNumbers.join(", ") + "</b>" });
			Generator.errors.push({ els: problemFields, error: L.invalid_node_names + " <b>" + rowNumbers.join(", ") + "</b>" });
		}

		if ($("#xml_root_node_name").val() == "") {
			Generator.errors.push({ els: [$("#xml_root_node_name")], error: L.missing_xml_root_node_name });
		} else if ($("#xml_root_node_name").val().match(/\W/)) {
			Generator.errors.push({ els: [$("#xml_root_node_name")], error: L.invalid_xml_root_node_name });
		} else if ($("#xml_record_node_name").val() == "") {
			Generator.errors.push({ els: [$("#xml_record_node_name")], error: L.missing_xml_record_node_name });
		} else if ($("#xml_record_node_name").val().match(/\W/)) {
			Generator.errors.push({ els: [$("#xml_record_node_name")], error: L.invalid_xml_record_node_name });
		}
		*/

		return errors;
	};


	var _loadSettings = function(settings) {
		$("#etXMLRootNodeName").val(settings.rootNodeName);
		$("#etXMLRecordNodeName").val(settings.recordNodeName);
		if (settings.useCustomExportFormat == "1") {
			$("#etXMLUseCustomExportFormat").attr("checked", "checked");
		} else {
			$("#etXMLUseCustomExportFormat").removeAttr("checked");
		}
		$("#etXMLUseCustomExportFormat").trigger("click");
		_codeMirror.setValue(settings.customFormat);
	};

	var _saveSettings = function() {
		return {
			rootNodeName: $("#etXMLRootNodeName").val(),
			recordNodeName: $("#etXMLRecordNodeName").val(),
			useCustomExportFormat: $("#etXMLUseCustomExportFormat").attr("checked") ? 1 : 0,
			customFormat: _codeMirror.getValue()
		};
	};

	var _resetSettings = function() {
		$("#etXMLRootNodeName").val("records");
		$("#etXMLRecordNodeName").val("record");
		$("#etXMLUseCustomExportFormat").removeAttr("checked").trigger("click");
		_codeMirror.setValue(_defaultCustomXML);
	};

	/**
	 * Called when the user changes the result type. This just changes the 2nd column heading to be
	 * "Node Name" rather than the default "Column Title".
	 */
	var _resultTypeChanged = function(msg) {
		if (msg.newExportType == "XML") {
			$("#gdColTitleTop,#gdColTitleBottom").html(LANG.row_label);
		}
	};

	var _openEditCustomFormatDialog = function() {
		var dimensions = _getDialogDimensions();

		// calculate size of main content area
		$("#etXMLCustomFormatDialog").dialog({
			title: "Custom XML Format",
			modal: true,
			width: dimensions.dialogWidth,
			height: dimensions.dialogHeight,
			open: function() {
				$("#etXMLCustomContent .CodeMirror-scroll").css({
					width: dimensions.contentWidth,
					height: dimensions.contentHeight
				});
				_codeMirror.refresh();
			},
			buttons: [
				{
					text: "Close",
					click: function() {
						$(this).dialog("close");
					}
				}
			]
		});

		return false;
	};


	var _getDialogDimensions = function() {
		var dialogHeight  = ($(window).height() / 100) * 90;
		var dialogWidth   = ($(window).width() / 100) * 90;
		var contentHeight = dialogHeight - 110;
		var contentWidth  = dialogWidth - 370;

		return {
			dialogHeight: dialogHeight,
			dialogWidth: dialogWidth,
			contentHeight: contentHeight,
			contentWidth: contentWidth
		};
	};

	var _updateDialogDimensions = function() {
		var dimensions = _getDialogDimensions();
		$("#etHTMLCustomFormatDialog").dialog("option", "width", dimensions.dialogWidth);
		$("#etHTMLCustomFormatDialog").dialog("option", "height", dimensions.dialogHeight);
	};

	var _resetCustomHTML = function() {
		_codeMirror.setValue(_defaultCustomXML);
	};


	manager.registerExportType(MODULE_ID, {
		
		/**
		 * @function
		 * @name XML#init
		 */
		init: _init,

		/**
		 * Our validation function performed when the user clicks the main Generate button. This ensures the
		 * XML additional settings are filled in properly and all rows have a valid node name.
		 * @function
		 * @name XML#validate
		 */
		validate: _validate,

		/**
		 * @function
		 * @name XML#loadSettings
		 */
		loadSettings: _loadSettings,

		/**
		 * @function
		 * @name XML#saveSettings
		 */
		saveSettings: _saveSettings,

		/**
		 * @function
		 * @name XML#resetSettings
		 */
		resetSettings: _resetSettings
	});

});