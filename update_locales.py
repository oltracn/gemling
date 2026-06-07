import json
import os

locales_dir = "_locales"

translations = {
    "en": {
        "actionAdd": "Move",
        "tooltipAdd": "Move to a specific notebook",
        "tooltipExport": "Export as a PDF file",
        "tooltipDelete": "Cannot be recovered after deletion. Please proceed with caution."
    },
    "zh_CN": {
        "actionAdd": "移动",
        "tooltipAdd": "移动至指定的笔记本",
        "tooltipExport": "打包导出PDF文件",
        "tooltipDelete": "删除后无法恢复，请谨慎操作"
    },
    "de": {
        "actionAdd": "Verschieben",
        "tooltipAdd": "In ein bestimmtes Notizbuch verschieben",
        "tooltipExport": "Als PDF-Datei exportieren",
        "tooltipDelete": "Kann nach dem Löschen nicht wiederhergestellt werden. Bitte mit Vorsicht fortfahren."
    },
    "es": {
        "actionAdd": "Mover",
        "tooltipAdd": "Mover a un cuaderno específico",
        "tooltipExport": "Exportar como archivo PDF",
        "tooltipDelete": "No se puede recuperar después de la eliminación. Por favor proceda con precaución."
    },
    "fr": {
        "actionAdd": "Déplacer",
        "tooltipAdd": "Déplacer vers un carnet spécifique",
        "tooltipExport": "Exporter en tant que fichier PDF",
        "tooltipDelete": "Impossible de récupérer après suppression. Veuillez procéder avec prudence."
    },
    "ja": {
        "actionAdd": "移動",
        "tooltipAdd": "指定したノートブックに移動する",
        "tooltipExport": "PDFファイルとしてエクスポートする",
        "tooltipDelete": "削除後は元に戻せません。慎重に操作してください。"
    },
    "pt_BR": {
        "actionAdd": "Mover",
        "tooltipAdd": "Mover para um caderno específico",
        "tooltipExport": "Exportar como um arquivo PDF",
        "tooltipDelete": "Não pode ser recuperado após a exclusão. Por favor, proceda com cuidado."
    },
    "th": {
        "actionAdd": "ย้าย",
        "tooltipAdd": "ย้ายไปยังสมุดบันทึกที่ระบุ",
        "tooltipExport": "ส่งออกเป็นไฟล์ PDF",
        "tooltipDelete": "ไม่สามารถกู้คืนได้หลังจากลบ โปรดดำเนินการด้วยความระมัดระวัง"
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
            
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write('\n')

print("Locales updated.")
