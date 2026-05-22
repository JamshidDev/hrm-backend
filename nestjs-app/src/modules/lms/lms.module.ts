// LMS module aggregator. Laravel: Modules/LMS (~35 routes, 18 controllers).
// 12 ta sub-modul:
//   - main: GET /lms/{enums, learning-centers, list/*}
//   - directions: /lms/directions CRUD
//   - subjects: /lms/subjects CRUD
//   - specializations: /lms/specializations CRUD
//   - edu-plans: /lms/edu-plan CRUD + attached-workers + detach-workers
//   - edu-plan-exams: /lms/exams (attach/detach/list/result)
//   - teachers: /lms/teachers CRUD + /lms/teacher/lessons
//   - lessons: /lms/lessons CRUD + show-participants + create-meet
//   - groups: /lms/{generate-groups, detach-workers-in-group, groups, group-workers, protocol, worker-exams}
//   - listeners: /lms/listener + /listener/lessons + /listener/lessons/:id
//   - certificates: /lms/certificates + /certificate/generate
//   - zoom-webhook: /zoom/webhook (Public)

import { Module } from '@nestjs/common';
import { LmsMainModule } from '@/modules/lms/main/main.module';
import { LmsDirectionModule } from '@/modules/lms/directions/direction.module';
import { LmsSubjectModule } from '@/modules/lms/subjects/subject.module';
import { LmsSpecializationModule } from '@/modules/lms/specializations/specialization.module';
import { LmsEduPlanModule } from '@/modules/lms/edu-plans/edu-plan.module';
import { LmsEduPlanExamModule } from '@/modules/lms/edu-plan-exams/edu-plan-exam.module';
import { LmsTeacherModule } from '@/modules/lms/teachers/teacher.module';
import { LmsLessonModule } from '@/modules/lms/lessons/lesson.module';
import { LmsGroupModule } from '@/modules/lms/groups/group.module';
import { LmsListenerModule } from '@/modules/lms/listeners/listener.module';
import { LmsCertificateModule } from '@/modules/lms/certificates/certificate.module';
import { LmsZoomWebhookModule } from '@/modules/lms/zoom-webhook/zoom-webhook.module';

@Module({
  imports: [
    LmsMainModule,
    LmsDirectionModule,
    LmsSubjectModule,
    LmsSpecializationModule,
    LmsEduPlanModule,
    LmsEduPlanExamModule,
    LmsTeacherModule,
    LmsLessonModule,
    LmsGroupModule,
    LmsListenerModule,
    LmsCertificateModule,
    LmsZoomWebhookModule,
  ],
})
export class LmsModule {}
