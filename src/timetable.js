const { toPronoteWeek } = require('./data/weeks');
const { getFilledDaysAndWeeks, getTimetable } = require('./fetch/timetable');

async function timetable(session, from = new Date(), to = null)
{
    if (!to || to > from) {
        to = new Date(from.getTime());
        to.setDate(to.getDate() + 1);
    }

    const filled = await getFilledDaysAndWeeks(session);
    if (!filled) {
        return [];
    }

    const fromWeek = toPronoteWeek(session, from);
    const toWeek = toPronoteWeek(session, to);

    const weeks = [];
    for (let i = fromWeek; i <= toWeek; i++) {
        weeks.push(i);
    }

    const result = [];
    for (const week of weeks) {
        const timetable = await getTimetable(session, week);
        const lessons = getTimetableWeek(session, timetable);

        lessons.filter(l => l.from >= from && l.from <= to).forEach(lesson => {
            if (!filled.filledWeeks.includes(week)) {
                lesson.isCancelled = true;
            }

            result.push(lesson);
        });
    }

    return result.sort((a, b) => a.from - b.from);
}

function getTimetableWeek(session, table) {
    const result = [];

    for (const lesson of table.lessons) {
        const from = lesson.date;
        const to = new Date(from.getTime() + (lesson.duration / session.params.ticksPerHour * 3600000));

        const res = {
            from,
            to,
            isDetention: lesson.isDetention,
            hasDuplicate: !!table.lessons.find(l => l.date.getTime() === from.getTime() && l !== lesson)
        };

        let room, subject, teacher;
        if (lesson.isDetention) {
            subject = lesson.content[0];
            teacher = lesson.content[1];
            room = lesson.content[2];
        } else {
            subject = lesson.content.find(o => o.type === 16);
            teacher = lesson.content.find(o => o.type === 3);
            room = lesson.content.find(o => o.type === 17);

            res.isAway = (lesson.status || false) && !!lesson.status.match(/(.+)?prof(.+)?absent(.+)?/giu);
            res.isCancelled = !res.isAway && lesson.isCancelled;
            res.color = lesson.color;
        }

        res.subject = subject && subject.name || null;
        res.teacher = teacher && teacher.name || null;
        res.room = room && teacher.room || null;

        result.push(res);
    }

    return result;
}

module.exports = timetable;
