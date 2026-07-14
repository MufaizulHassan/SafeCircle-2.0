import torch
import torch.nn as nn
import torch.nn.functional as F
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import XLMRobertaModel, XLMRobertaTokenizer

app = FastAPI(title="SafeCircle NLP Severity Service")

# ============================================================
# This is your EXACT model class from the research notebook
# (Cell 10 - "Model Building"). Do not change the architecture
# here, even slightly - the saved weights in best_multitask_model.bin
# were trained against this exact structure and won't load correctly
# into anything different.
# ============================================================
class MultiTaskXLMRoBERTa(nn.Module):
    def __init__(self, num_labels, dropout_rate=0.1):
        super(MultiTaskXLMRoBERTa, self).__init__()
        self.xlmr = XLMRobertaModel.from_pretrained('xlm-roberta-base')
        self.dropout = nn.Dropout(dropout_rate)
        self.classifier = nn.Linear(768, num_labels)   # Head 1: emotion class
        self.regressor = nn.Linear(768, 1)             # Head 2: intensity
        self.sigmoid = nn.Sigmoid()

    def forward(self, input_ids, attention_mask):
        outputs = self.xlmr(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output
        pooled_output = self.dropout(pooled_output)
        logits = self.classifier(pooled_output)
        intensity_score = self.sigmoid(self.regressor(pooled_output))
        return logits, intensity_score


# This is the EXACT label mapping printed during your actual training run
# (from your notebook's saved output). Do not reorder this - the integer
# the model predicts only makes sense against this exact mapping.
INV_LABEL_MAP = {0: 'sadness', 1: 'anger', 2: 'love', 3: 'surprise', 4: 'fear', 5: 'joy'}
NUM_LABELS = len(INV_LABEL_MAP)
MAX_LEN = 128

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

print("Loading tokenizer (xlm-roberta-base)...")
tokenizer = XLMRobertaTokenizer.from_pretrained('xlm-roberta-base')

print("Building model architecture...")
model = MultiTaskXLMRoBERTa(num_labels=NUM_LABELS)

print("Loading your trained weights from best_multitask_model.bin ...")
model.load_state_dict(torch.load('best_multitask_model.bin', map_location=device))
model.to(device)
model.eval()
print(f"Model ready on {device}.")


# ------------------------------------------------------------
# Severity mapping - this is the NEW part, not from your paper.
# Your model gives (emotion, intensity); SafeCircle needs a single
# "how urgent is this" severity. This weighting is a starting point
# we'll tune once we see it behave on real SOS-style sentences.
# ------------------------------------------------------------
EMOTION_WEIGHT = {
    'fear': 1.0,       # most directly signals active danger
    'anger': 0.85,
    'sadness': 0.5,
    'surprise': 0.4,
    'love': 0.0,
    'joy': 0.0,
}


def severity_bucket(score: float) -> str:
    if score >= 0.7:
        return "critical"
    if score >= 0.45:
        return "high"
    if score >= 0.2:
        return "medium"
    return "low"


class TextIn(BaseModel):
    text: str


@app.post("/classify")
def classify(payload: TextIn):
    text = payload.text

    # Same tokenization your notebook uses at inference time (Cell 18)
    encoding = tokenizer(
        text, max_length=MAX_LEN, padding='max_length',
        truncation=True, return_tensors='pt'
    )
    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)

    with torch.no_grad():
        logits, intensity = model(input_ids=input_ids, attention_mask=attention_mask)

    probs = F.softmax(logits, dim=1).squeeze().cpu().numpy()
    pred_idx = int(probs.argmax())
    emotion = INV_LABEL_MAP[pred_idx]
    intensity_val = float(intensity.item())

    weight = EMOTION_WEIGHT.get(emotion, 0.5)
    severity_score = intensity_val * weight
    severity = severity_bucket(severity_score)

    confidence_profile = {INV_LABEL_MAP[i]: round(float(p), 4) for i, p in enumerate(probs)}

    return {
        "text": text,
        "emotion": emotion,
        "intensity": round(intensity_val, 4),
        "severity_score": round(severity_score, 4),
        "severity": severity,
        "confidence_profile": confidence_profile,
        "model": "MultiTaskXLMRoBERTa-v1",
    }


@app.get("/health")
def health():
    return {"status": "ok", "device": str(device)}
