import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {PartnerIntegrationService} from '@core/services/partner-integration.service';
import {WorkflowTask} from '@shared/models/partner-integration';

@Component({
  selector: 'app-tasks',
  standalone: false,
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  tasks: WorkflowTask[] = [];
  ownerFilter = 'ALL';

  constructor(
    public partnerIntegration: PartnerIntegrationService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.tasks = this.partnerIntegration.getTasks();
  }

  get filteredTasks(): WorkflowTask[] {
    if (this.ownerFilter === 'ALL') return this.tasks;
    return this.tasks.filter(task => task.owner === this.ownerFilter);
  }

  openTask(task: WorkflowTask): void {
    this.router.navigate(['/app/request', task.requestId]);
  }
}
