import json
import os

locales_dir = "_locales"

translations = {
    "en": {
        "actionAdd": "Move",
        "tooltipAdd": "Move to a specific notebook",
        "tooltipExport": "Export as an HTML file",
        "tooltipDelete": "Cannot be recovered after deletion. Please proceed with caution.",
        "countMaxSelected": "Maximum 10 items selected"
    },
    "zh_CN": {
        "actionAdd": "移动",
        "tooltipAdd": "移动至指定的笔记本",
        "tooltipExport": "打包导出HTML文件",
        "tooltipDelete": "删除后无法恢复，请谨慎操作",
        "countMaxSelected": "最多选中 10 项"
    },
    "de": {
        "actionAdd": "Verschieben",
        "tooltipAdd": "In ein bestimmtes Notizbuch verschieben",
        "tooltipExport": "Als HTML-Datei exportieren",
        "tooltipDelete": "Kann nach dem Löschen nicht wiederhergestellt werden. Bitte mit Vorsicht fortfahren.",
        "countMaxSelected": "Maximal 10 Elemente ausgewählt"
    },
    "es": {
        "actionAdd": "Mover",
        "tooltipAdd": "Mover a un cuaderno específico",
        "tooltipExport": "Exportar como archivo HTML",
        "tooltipDelete": "No se puede recuperar después de la eliminación. Por favor proceda con precaución.",
        "countMaxSelected": "Máximo 10 elementos seleccionados"
    },
    "fr": {
        "actionAdd": "Déplacer",
        "tooltipAdd": "Déplacer vers un carnet spécifique",
        "tooltipExport": "Exporter en tant que fichier HTML",
        "tooltipDelete": "Impossible de récupérer après suppression. Veuillez procéder avec prudence.",
        "countMaxSelected": "Maximum 10 éléments sélectionnés"
    },
    "ja": {
        "actionAdd": "移動",
        "tooltipAdd": "指定したノートブックに移動する",
        "tooltipExport": "HTMLファイルとしてエクスポートする",
        "tooltipDelete": "削除後は元に戻せません。慎重に操作してください。",
        "countMaxSelected": "最大10アイテムが選択されました"
    },
    "pt_BR": {
        "actionAdd": "Mover",
        "tooltipAdd": "Mover para um caderno específico",
        "tooltipExport": "Exportar como um arquivo HTML",
        "tooltipDelete": "Não pode ser recuperado após a exclusão. Por favor, proceda com cuidado.",
        "countMaxSelected": "Máximo de 10 itens selecionados"
    },
    "th": {
        "actionAdd": "ย้าย",
        "tooltipAdd": "ย้ายไปยังสมุดบันทึกที่ระบุ",
        "tooltipExport": "ส่งออกเป็นไฟล์ HTML",
        "tooltipDelete": "ไม่สามารถกู้คืนได้หลังจากลบ โปรดดำเนินการด้วยความระมัดระวัง",
        "countMaxSelected": "เลือกได้สูงสุด 10 รายการ"
    }
}

for root, dirs, files in os.walk(locales_dir):
    for file in files:
        if file == "messages.json":
            path = os.path.join(root, file)
            locale = os.path.basename(root)
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            t = translations.get(locale, translations["en"])
            
            if "actionAdd" in data:
                data["actionAdd"]["message"] = t["actionAdd"]
            
            data["tooltipAdd"] = {"message": t["tooltipAdd"]}
            data["tooltipExport"] = {"message": t["tooltipExport"]}
            data["tooltipDelete"] = {"message": t["tooltipDelete"]}
            data["countMaxSelected"] = {"message": t["countMaxSelected"]}
            
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write('\n')

print("Locales updated.")
