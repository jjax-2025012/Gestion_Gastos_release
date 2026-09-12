import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  icon: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  data: NotificationItem[];
}

interface CreateNotificationResponse {
  success: boolean;
}

interface MarkAllAsReadResponse {
  success: boolean;
  updated: number;
}

interface DeleteNotificationResponse {
  success: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly refreshSubject = new Subject<void>();
  readonly refresh$ = this.refreshSubject.asObservable();
  private readonly url = `${environment.apiUrl}/notifications`;
  readonly unreadCount = signal(0);

  getNotifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationsResponse>(this.url).pipe(
      map((response) => response.data),
      tap((items) => this.unreadCount.set(items.filter((item) => item.is_read === false).length))
    );
  }

  createNotification(
    message: string,
    type: NotificationItem['type'] = 'info',
    icon = 'info'
  ): Observable<CreateNotificationResponse> {
    return this.http.post<CreateNotificationResponse>(this.url, { message, type, icon });
  }

  markAllAsRead(): Observable<MarkAllAsReadResponse> {
    return this.http.patch<MarkAllAsReadResponse>(`${this.url}/read-all`, {}).pipe(
      tap(() => this.unreadCount.set(0))
    );
  }

  deleteNotification(id: string): Observable<DeleteNotificationResponse> {
    return this.http.delete<DeleteNotificationResponse>(`${this.url}/${id}`);
  }

  notifyDataChanged(): void {
    this.refreshSubject.next();
  }
}