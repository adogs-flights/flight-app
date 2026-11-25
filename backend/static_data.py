# Major Airlines and Airports Static Data

AIRLINES = [
    {"value": "KE", "label": "대한항공 (Korean Air)"},
    {"value": "OZ", "label": "아시아나항공 (Asiana Airlines)"},
    {"value": "AC", "label": "에어캐나다 (Air Canada)"},
    {"value": "YP", "label": "에어프레미아 (Air Premia)"},
]

AIRPORTS = [
    {"value": "JFK", "label": "뉴욕 존 F. 케네디 국제공항 (JFK)"},
    {"value": "LAX", "label": "로스앤젤레스 국제공항 (LAX)"},
    {"value": "ORD", "label": "시카고 오헤어 국제공항 (ORD)"},
    {"value": "YVR", "label": "밴쿠버 국제공항 (YVR)"},
    {"value": "YYZ", "label": "토론토 피어슨 국제공항 (YYZ)"},
]


# 티켓별 출국 준비 체크리스트의 기본 항목.
# 티켓을 만들 때 이 목록대로 항목을 깔아두고, 담당자가 항목을 고치거나 지우거나
# 새로 추가한다. template_key는 "기본 항목 복원"에서 이미 있는 항목을 다시 만들지
# 않기 위한 식별자이므로 한 번 배포한 키는 바꾸지 않는다. 담당자가 직접 추가한
# 항목은 template_key가 비어 있다.
DEPARTURE_CHECKLIST_TEMPLATE = [
    {"template_key": "airline_pet_booking", "label": "항공사 반려동물 동반 예약 확인"},
    {"template_key": "export_quarantine", "label": "수출 검역증명서 발급"},
    {"template_key": "rabies_record", "label": "광견병 예방접종·항체 검사 확인"},
    {"template_key": "microchip", "label": "마이크로칩 번호 확인"},
    {"template_key": "destination_documents", "label": "도착국 입국 서류 확인"},
    {"template_key": "kennel", "label": "켄넬(이동장) 규격 확인·준비"},
    {"template_key": "receiver_contact", "label": "현지 인수자 연락 확인"},
    {"template_key": "airport_meeting", "label": "공항 미팅 시간·장소 공유"},
    {"template_key": "dog_handover", "label": "공항에서 강아지 인수 확인"},
]
