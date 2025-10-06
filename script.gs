function doGet() {
    const template = HtmlService.createTemplateFromFile('Index');
    template.workers = getWorkers();
    template.topics = getTopics();
    return template.evaluate()
        .setTitle('Biblioteka Nadarzyn')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getWorkers() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pracownicy');
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    const headers = values.shift();
    const nameIndex = headers.indexOf('Imię');
    if (nameIndex === -1) return [];
    return values.filter(r => r[nameIndex]).map(r => r[nameIndex]);
}

function getTopics() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tematy');
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    const headers = values.shift();
    const topicIndex = headers.indexOf('Temat');
    if (topicIndex === -1) return [];
    return values.filter(r => r[topicIndex]).map(r => r[topicIndex]);
}

function saveReservation(data) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rezerwacje');
    if (!sheet) throw new Error('Sheet "Rezerwacje" not found.');
    sheet.appendRow([
        new Date(),
        data.worker || '',
        data.topic || '',
        data.date || '',
        data.time || ''
    ]);
    return 'OK';
}

function getWorkingHours(workerName, dateStr) {
    function getFormattedSlot(date) {
        const slotH = String(date.getHours()).padStart(2, '0');
        const slotM = String(date.getMinutes()).padStart(2, '0');
        return `${slotH}:${slotM}`;
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Godziny pracy');
    if (!sheet) return [];

    const values = sheet.getDataRange().getValues();
    const headers = values.shift();
    const row = values.find(r => r[0] === workerName);
    if (!row) return [];

    const date = new Date(dateStr);
    const days = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
    const dayName = days[date.getDay()];
    const colIndex = headers.indexOf(dayName);
    if (colIndex === -1) return [];

    const hoursCell = row[colIndex];
    if (!hoursCell) return [];

    const [startStr, endStr] = hoursCell.split('-');
    const slots = [];
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    let current = new Date(date);
    current.setHours(startH, startM, 0, 0);
    const end = new Date(date);
    end.setHours(endH, endM, 0, 0);

    while (current < end) {
        slots.push(getFormattedSlot(current));
        current.setHours(current.getHours() + 1);
    }

    // Remove booked slots
    const bookingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rezerwacje');
    if (bookingsSheet) {
        const bookings = bookingsSheet.getDataRange().getValues();
        bookings.shift();

        const date = new Date(dateStr);

        const bookedSlots = bookings
            .filter(r => {
                const isSameWorker = r[1] === workerName;
                const bookedDate = new Date(r[3]);
                const isSameDate = date.getFullYear() === bookedDate.getFullYear() && date.getMonth() === bookedDate.getMonth() && date.getDate() === bookedDate.getDate();
                return isSameWorker && isSameDate;
            })
            .map(r => getFormattedSlot(r[4]));

        Logger.log(bookedSlots)
        return slots.filter(s => !bookedSlots.includes(s));
    }

    return slots;
}
